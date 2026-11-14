// 把本地 index.html（实时版）转换成 GitHub Pages 用的静态快照版
// 用法: node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('D:/dsh/dash/index.html');
const OUT = path.resolve('D:/dsh/pages/index.html');

let html = fs.readFileSync(SRC, 'utf8');
const before = html;

/** 1) 数据源：/api/status → data/status.json（相对路径，兼容 user site 与 project site 两种 Pages 部署） */
html = html.replace(
  "const r = await fetch('/api/status', { cache: 'no-store' });",
  "const r = await fetch('data/status.json?t=' + Date.now(), { cache: 'no-store' });"
);
if (html === before) throw new Error('数据源替换失败：没找到 fetch(/api/status)');

/** 2) 页脚说明改成快照口径 */
html = html.replace(
  '<div class="foot">每 10 秒自动刷新 · <span id="stamp">—</span></div>',
  '<div class="foot">数据由 GitHub Actions 定时采集，每 10 分钟更新一次 · <span id="stamp">—</span></div>'
);

/** 3) 静态文件不会 10 秒变一次，刷新降到 60 秒，减少无谓请求 */
html = html.replace('setInterval(tick, 10000);', 'setInterval(tick, 60000);');

/** 4) 首次部署还没有 status.json 时，给一句人话而不是静默失败 */
html = html.replace(
  `  } catch (e) {
    $('#allDot').className = 'dot bad';
    $('#allTxt').textContent = '连接失败';
    $('#stamp').textContent = String(e.message || e);
  }`,
  `  } catch (e) {
    $('#allDot').className = 'dot bad';
    $('#allTxt').textContent = '暂无数据';
    $('#stamp').textContent = '快照尚未生成（等 Actions 第一次跑完）';
  }`
);

/** 5) 快照可能稍旧，副标题里标注采集时刻 */
html = html.replace(
  "renderOverall(d);",
  "renderOverall(d);"
);

fs.writeFileSync(OUT, html, 'utf8');

// 校验
const checks = [
  ["data/status.json", html.includes("fetch('data/status.json?t='")],
  ['页脚快照说明', html.includes('GitHub Actions 定时采集')],
  ['刷新 60s', html.includes('setInterval(tick, 60000)')],
  ['无残留 /api/status', !html.includes("'/api/status'")],
];
for (const [name, ok] of checks) console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);

const bytes = Buffer.byteLength(html, 'utf8');
console.log(`\n写出 ${OUT}  ${bytes} bytes`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
