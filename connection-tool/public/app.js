const form = document.querySelector('#settings');
const status = document.querySelector('#status');
const test = document.querySelector('#test');
const copy = document.querySelector('#copy');
const output = document.querySelector('#report');
form.addEventListener('submit', async event => {
  event.preventDefault(); test.disabled = true; copy.disabled = true; status.textContent = '測試中…';
  try {
    const response = await fetch('/probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const report = await response.json();
    if (!response.ok) throw Error(report.error);
    status.textContent = `${report.overall} — 已儲存 reports/connection-test-latest.json；本次未驗證 ChatGPT 雙向通訊`;
    const rows = document.querySelector('#checks'); rows.replaceChildren();
    for (const [name, result] of Object.entries(report.checks)) {
      const row = document.createElement('tr');
      for (const text of [name, result, report.details[name].duration_ms, report.details[name].reason ?? report.errors.find(e => e.check === name)?.message ?? '']) {
        const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
      }
      rows.append(row);
    }
    output.textContent = JSON.stringify(report, null, 2); copy.disabled = false;
  } catch (error) { status.textContent = `FAIL — ${error.message}`; }
  finally { test.disabled = false; }
});
copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(output.textContent); }
  catch { status.textContent = '剪貼簿不可用，請手動複製下方 JSON。'; }
});
