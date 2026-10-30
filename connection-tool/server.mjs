import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { probe, saveReport } from './probe.mjs';

const origin = 'http://127.0.0.1:4319';
const reports = fileURLToPath(new URL('../reports/', import.meta.url));
let busy = false;
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  if (req.headers.host !== '127.0.0.1:4319') { res.writeHead(403).end('{}'); return; }
  try {
    if (req.method === 'GET' && ['/', '/app.js'].includes(req.url)) {
      res.setHeader('Content-Type', req.url === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
      res.end(await readFile(new URL(req.url === '/' ? './public/index.html' : './public/app.js', import.meta.url))); return;
    }
    if (req.method === 'POST' && req.url === '/probe' && req.headers.origin === origin && req.headers['content-type'] === 'application/json') {
      if (busy) { res.writeHead(409).end('{"error":"測試進行中"}'); return; }
      busy = true;
      try {
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 8192) throw Error('BODY_TOO_LARGE'); }
        const input = JSON.parse(body);
        // No production browser adapter is installed. Client flags cannot enable one.
        const report = await probe({ ...input, experimental: false, authorizeSend: false });
        await saveReport(reports, report);
        res.end(JSON.stringify(report));
      } finally { busy = false; }
      return;
    }
    res.writeHead(404).end('{}');
  } catch { res.writeHead(500).end('{"error":"測試或報告儲存失敗"}'); }
}).listen(4319, '127.0.0.1', () => console.log(`Dev AutoPilot V1.1: ${origin}`));
