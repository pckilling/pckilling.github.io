# Amia bot · 服务状态

静态快照版服务面板，托管在 GitHub Pages。数据由服务器上的 cron 定时从本机 API 抓取，通过
GitHub REST API 提交成 `data/status.json`，页面只负责渲染。

访问地址：<https://pckilling.github.io/>

## 架构

```
/opt/status/server.js         (systemd 常驻，实时采集，监听 127.0.0.1:8090)
        │
        │  cron 每 10 分钟: node /opt/status/push_github.mjs
        │  GET http://127.0.0.1:8090/api/status
        ▼
GitHub REST API  api.github.com               (PUT contents/data/status.json)
        │
        ▼
GitHub Pages     index.html                   (纯静态，任意浏览器访问)
```

不用 GitHub Actions 的原因：本机与服务器都**无法连接 `github.com:443`**（`Failed to connect
... after 21060 ms`），只有 `api.github.com:443` 稳定可用；同时用户 token 只有 `repo` scope，
缺少推送 `.github/workflows/*` 所需的 `workflow` scope。改为服务器端 cron 直推 REST API，
两个问题一起绕开。

## 部署（已在 cn-sha-k1 完成）

| 项目 | 值 |
|---|---|
| 采集服务 | `/etc/systemd/system/yukihina-status.service` → `node /opt/status/server.js` |
| 推送脚本 | `/opt/status/push_github.mjs` |
| token | `/opt/status/.gh_token`（600，root）|
| cron | `*/10 * * * * cd /opt/status && /usr/bin/node push_github.mjs >> /opt/status/push.log 2>&1` |
| 推送日志 | `/opt/status/push.log` |

```bash
# 手动跑一次
cd /opt/status && node push_github.mjs

# 看历史
tail -20 /opt/status/push.log
```

`push_github.mjs` 的行为：

- 拉不到本机快照、或快照缺 `at`/`system`/`processes`/`ports`/`plugins`/`usage` 任一字段 → **报错退出，不推送**，线上保留上一份好数据。
- 内容与线上一致（忽略 `at` 时间戳）→ **跳过**，不产生空提交。
- 否则 `PUT /repos/pckilling/pckilling.github.io/contents/data/status.json`，commit message 带采集时刻。

## 更新页面

`index.html` 是从实时版 `D:\dsh\dash\index.html` 转换来的。改样式/布局请改源文件，然后：

```bash
node build.mjs
```

`build.mjs` 做 4 处替换并逐项断言：

1. `fetch('/api/status')` → `fetch('data/status.json')`
2. 页脚文案改为快照口径
3. 轮询间隔 10s → 60s
4. 首次无数据时的报错改成「快照尚未生成」

推上去（`github.com:443` 不通，用 REST API）：

```bash
GH_TOKEN=ghp_xxx node push_api.mjs pckilling pckilling.github.io main index.html
```

本地预览：

```bash
node serve.mjs 8123   # 然后打开 http://127.0.0.1:8123
```

## 说明与限制

- **数据最多滞后 10 分钟**，取决于 cron 实际触发时刻。
- **页面公开可见**，任何人访问都能看到服务器状态（hostname、进程、插件、余额）。
- **token 于 2026-11-21 16:10 UTC 过期**，届时需更换 `/opt/status/.gh_token`，否则推送开始失败（页面数据会停住）。
- 只有 `repo` scope，所以**不能**推送 `.github/workflows/*`；要恢复 Actions 路线需重新签发带 `workflow` scope 的 token。
