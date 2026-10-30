import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, mkdir, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const execute = promisify(execFile);
export function originalUrl(value) {
  try {
    const u = new URL(value);
    return u.origin === 'https://chatgpt.com' && !u.username && !u.password &&
      /^\/c\/[a-zA-Z0-9-]+$/.test(u.pathname) && !u.search && !u.hash;
  } catch { return false; }
}
// Fixed read-only commands only. Neither task content nor browser replies become commands.
export async function cliCheck(file, args, cwd) {
  await execute(file, args, { cwd, timeout: 10000, maxBuffer: 65536, windowsHide: true, shell: false });
}
export async function probe(input, { run = cliCheck, browser = null, timeoutMs = 15000 } = {}) {
  async function bounded(action) {
    let timer;
    try { return await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('TIMEOUT')), timeoutMs); })]); }
    finally { clearTimeout(timer); }
  }
  const report = { schema_version: '1.0', tested_at: new Date().toISOString(),
    chat_url_type: originalUrl(input.chatUrl) ? 'original_conversation' : 'invalid',
    checks: {}, details: {}, roundtrip_tested: false, overall: 'PARTIAL', errors: [] };
  async function check(name, action) {
    const start = Date.now();
    try { await action(); report.checks[name] = 'PASS'; }
    catch { report.checks[name] = 'FAIL'; report.errors.push({ check: name, code: 'CHECK_FAILED', message: `${name} 失敗；請檢查安裝、登入、路徑或連接器狀態。` }); }
    report.details[name] = { tested_at: new Date().toISOString(), duration_ms: Date.now() - start };
    return report.checks[name] === 'PASS';
  }
  function skip(name, reason) {
    report.checks[name] = 'SKIPPED'; report.details[name] = { duration_ms: 0, reason };
  }
  const validPath = await check('repo_path', async () => {
    if (typeof input.repoPath !== 'string' || !path.isAbsolute(input.repoPath) || !(await stat(input.repoPath)).isDirectory()) throw Error();
  });
  for (const cli of ['git', 'gh', 'codex']) {
    if (validPath) await check(`${cli}_cli`, () => run(cli, ['--version'], input.repoPath));
    else skip(`${cli}_cli`, '專案路徑無效');
  }
  if (report.checks.git_cli === 'PASS') await check('git_repo', () => run('git', ['rev-parse', '--show-toplevel'], input.repoPath));
  else skip('git_repo', 'Git 不可用');
  if (report.checks.gh_cli === 'PASS') {
    const auth = await check('github_auth', () => run('gh', ['auth', 'status'], input.repoPath));
    if (auth) await check('github_read', async () => {
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.githubRepo ?? '')) throw Error();
      await run('gh', ['repo', 'view', input.githubRepo, '--json', 'nameWithOwner'], input.repoPath);
    }); else skip('github_read', 'GitHub 登入檢查失敗');
  } else { skip('github_auth', 'gh 不可用'); skip('github_read', 'gh 不可用'); }
  if (report.checks.codex_cli === 'PASS') await check('codex_auth', () => run('codex', ['login', 'status'], input.repoPath));
  else skip('codex_auth', 'Codex CLI 不可用');
  const urlOk = await check('chat_url', async () => { if (!originalUrl(input.chatUrl)) throw Error(); });
  const enabled = input.experimental === true && browser;
  let ready = false;
  if (urlOk && enabled) {
    let page;
    const opened = await check('chat_open', async () => {
      page = await bounded(() => browser.open(input.chatUrl));
      if (page.url !== input.chatUrl || page.challenge) throw Error();
    });
    if (opened) ready = await check('chat_auth', async () => {
      if (!input.account || page.account !== input.account || !page.loggedIn) throw Error();
    }); else skip('chat_auth', '頁面或安全驗證失敗');
  } else {
    skip('chat_open', 'EXPERIMENTAL 連接器停用或尚未實作');
    skip('chat_auth', '無法驗證登入帳號與對話');
  }
  if (ready && input.authorizeSend === true) {
    report.roundtrip_tested = true;
    const id = randomUUID();
    report.probe_id = id;
    const sentAt = Date.now();
    const sent = await check('chat_send', () => bounded(() => browser.sendOnce(input.chatUrl,
      `AUTOPILOT_CONNECTION_TEST\n請只回覆單一 JSON：${JSON.stringify({ type: 'AUTOPILOT_PONG', probe_id: id, status: 'ok' })}\n這是連線測試，請勿執行任何開發任務。`)));
    if (sent) await check('chat_reply_match', async () => {
      const replies = await bounded(() => browser.replyOnce(input.chatUrl, timeoutMs));
      if (!Array.isArray(replies) || replies.length !== 1) throw Error();
      const r = replies[0];
      if (!r.complete || r.url !== input.chatUrl || !Number.isFinite(r.timestamp) || r.timestamp < sentAt || r.timestamp > Date.now()) throw Error();
      const pong = JSON.parse(r.text);
      if (Object.keys(pong).sort().join(',') !== 'probe_id,status,type' || pong.type !== 'AUTOPILOT_PONG' || pong.probe_id !== id || pong.status !== 'ok') throw Error();
    }); else skip('chat_reply_match', '發送失敗；禁止重送');
  } else { skip('chat_send', '未授權或連接器不可用'); skip('chat_reply_match', '未進行雙向測試'); }
  const values = Object.values(report.checks);
  report.overall = values.includes('FAIL') ? 'FAIL' : values.every(v => v === 'PASS') ? 'PASS' : 'PARTIAL';
  return report;
}
export async function saveReport(directory, report) {
  await mkdir(directory, { recursive: true });
  const temp = path.join(directory, 'connection-test-latest.json.tmp');
  await writeFile(temp, JSON.stringify(report, null, 2), 'utf8');
  await rename(temp, path.join(directory, 'connection-test-latest.json'));
}
