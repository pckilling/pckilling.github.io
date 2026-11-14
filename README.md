# Amia bot · 服务状态

静态快照版服务面板，托管在 GitHub Pages。数据由 GitHub Actions 定时从源站 API 抓取，提交成
`data/status.json`，页面只负责渲染。

访问地址：<https://pckilling.github.io/>

## 架构

```
cn-sha-k1 服务器 /opt/status/server.js        (实时采集，仅局域网/公网 IP 可访问)
        │
        │  curl  http://<ip>:8090/api/status
        ▼
GitHub Actions  .github/workflows/snapshot.yml  (每 10 分钟)
        │
        │  git commit data/status.json
        ▼
GitHub Pages  index.html                        (纯静态，任意浏览器访问)
```

## 一次性配置

### 1. 仓库变量

`Settings → Secrets and variables → Actions → Variables → New repository variable`

| Name | Value |
|---|---|
| `STATUS_API_URL` | `http://47.100.177.223:8090/api/status` |

### 2. 确认 Pages

用户主页仓库 `<用户名>.github.io` 默认从 `main` 分支根目录发布，通常无需额外设置。
可在 `Settings → Pages` 确认 Source 为 `Deploy from a branch` / `main` / `/ (root)`。

### 3. 触发第一次采集

`Actions → Collect server snapshot → Run workflow`。
跑完仓库里会出现真实的 `data/status.json`，页面随即有数据。

## 本地构建

`index.html` 是从实时版转换来的。改样式/布局请改 `build.mjs` 里的源文件，然后：

```bash
node build.mjs
```

`build.mjs` 会做 4 处替换并逐项断言：

1. `fetch('/api/status')` → `fetch('data/status.json')`
2. 页脚文案改为快照口径
3. 轮询间隔 10s → 60s
4. 首次无数据时的报错改成「快照尚未生成」

本地预览：

```bash
node serve.mjs 8123   # 然后打开 http://127.0.0.1:8123
```

## 说明与限制

- **数据最多滞后 10 分钟**。GitHub 的 cron 在整点前后有排队，实际可能晚 5～15 分钟。
- **页面公开可见**，任何人访问都能看到服务器状态（hostname、进程、插件、余额）。
- 源站接口返回非 200 时工作流失败退出，**保留上一份快照**，不会把错误内容写进去。
- 源站必须能被 GitHub 的 runner 访问到。当前用的是 IP 直连，因为域名被阿里云备案拦截。
