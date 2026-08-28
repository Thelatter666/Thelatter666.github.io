#!/usr/bin/env node
/**
 * 构建期生成 PDF 简历（spec §9.2）。
 *
 * 在 astro build 之后运行：对 dist/ 起一个本地静态服务，
 * 用 headless Chrome 打开 /resume/print，按模板里 @page 的 A4/10mm 设置渲染成 PDF。
 *
 * CI 中必须先安装 fonts-noto-cjk，否则中文全是豆腐块（spec §9.3）。
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      // 阻止路径穿越
      const safe = normalize(p).replace(/^(\.\.[/\\])+/, '');
      let file = join(ROOT, safe);
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      // Astro 的 build.format='directory' 产出的是 /resume/print/index.html，
      // 请求 /resume/print 时必须回退到目录下的 index.html，否则会 404
      try {
        const s = await stat(file);
        if (s.isDirectory()) file = join(file, 'index.html');
      } catch {
        file = join(ROOT, safe, 'index.html');
      }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
let browser;

try {
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/resume/print`, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');

  const out = join(ROOT, 'resume.pdf');
  await page.pdf({
    path: out,
    // 页边距由打印模板的 @page { size: A4; margin: 10mm } 控制
    preferCSSPageSize: true,
    printBackground: true,
  });

  // 失败保护：产物过小说明渲染出了问题，直接让构建失败（spec §15）
  const { size } = await stat(out);
  if (size < 10_000) {
    throw new Error(`resume.pdf 异常过小（${size} 字节），疑似渲染失败`);
  }
  console.log(`[pdf] 生成成功：dist/resume.pdf（${(size / 1024).toFixed(1)} KB）`);
} finally {
  await browser?.close();
  server.close();
}
