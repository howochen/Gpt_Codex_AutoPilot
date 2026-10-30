import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { probe, originalUrl, saveReport } from '../probe.mjs';
const input = { repoPath: process.cwd(), githubRepo: 'owner/repo', chatUrl: 'https://chatgpt.com/c/test-123', account: 'expected', experimental: true, authorizeSend: true };
function fixture(mode) {
  const commands = []; let sends = 0; let id;
  const run = async (file, args) => { commands.push([file, ...args]); if (mode === 'cliFail') throw Error('secret token'); };
  const browser = {
    async open(url) { return { url: mode === 'redirect' ? `${url}-other` : url, account: mode === 'account' ? 'other' : 'expected', loggedIn: mode !== 'logout', challenge: mode === 'captcha' }; },
    async sendOnce(url, text) { sends++; id = JSON.parse(text.split('JSON：')[1].split('\n')[0]).probe_id; if (mode === 'sendFail') throw Error(); },
    async replyOnce(url) {
      if (mode === 'timeout') return new Promise(() => {});
      const r = { url, timestamp: Date.now(), complete: mode !== 'truncated', text: mode === 'invalid' ? '{' : JSON.stringify({ type: 'AUTOPILOT_PONG', probe_id: mode === 'wrongId' ? 'wrong' : id, status: 'ok' }) };
      return mode === 'duplicate' ? [r, r] : [r];
    }
  };
  return { run, browser, timeoutMs: 10, commands, sends: () => sends };
}
test('strict original URL validation', () => {
  assert.ok(originalUrl(input.chatUrl));
  for (const url of ['https://chatgpt.com/share/123', 'https://chatgpt.com.evil/c/x', 'http://chatgpt.com/c/x', 'https://user@chatgpt.com/c/x', `${input.chatUrl}?x=1`]) assert.equal(originalUrl(url), false);
});
for (const mode of ['ok', 'redirect', 'account', 'logout', 'captcha', 'sendFail', 'timeout', 'truncated', 'invalid', 'wrongId', 'duplicate', 'cliFail']) {
  test(`fake browser: ${mode}`, async () => {
    const f = fixture(mode); const r = await probe(input, f);
    assert.equal(r.overall, mode === 'ok' ? 'PASS' : 'FAIL');
    assert.ok(f.sends() <= 1);
    assert.ok(f.commands.every(c => ['--version', 'rev-parse', 'auth', 'repo', 'login'].includes(c[1])));
    assert.ok(!JSON.stringify(r).includes('secret token'));
    if (['redirect', 'account', 'logout', 'captcha'].includes(mode)) assert.equal(f.sends(), 0);
  });
}
test('disabled or unauthorized never sends', async () => {
  for (const flags of [{ experimental: false }, { authorizeSend: false }]) {
    const f = fixture('ok'); const r = await probe({ ...input, ...flags }, f);
    assert.equal(r.overall, 'PARTIAL'); assert.equal(f.sends(), 0); assert.equal(r.roundtrip_tested, false);
  }
});
test('report persists without raw conversation', async () => {
  const dir = await mkdtemp(path.join(process.cwd(), '.autopilot-test-'));
  try {
    const r = await probe(input, fixture('ok')); await saveReport(dir, r);
    assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'connection-test-latest.json'), 'utf8')), r);
    assert.ok(!JSON.stringify(r).includes('AUTOPILOT_CONNECTION_TEST'));
  } finally { await rm(dir, { recursive: true }); }
});
