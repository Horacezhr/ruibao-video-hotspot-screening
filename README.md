# 睿宝视频号热点筛选

一个用于筛选儿科、益生菌、儿童保健和儿童健康相关视频号选题的热点看板。

## 本地运行

```bash
npm install
npm run dev
```

## 内容更新

热点数据放在 `public/hotspots.json`。页面上线后会读取这个文件展示候选热点。

手动更新：

```bash
npm run update:hotspots
```

自动更新：项目包含 GitHub Pages 工作流 `.github/workflows/deploy.yml`，每 10 分钟自动抓取热点、构建并发布网站。

## 健康内容提醒

本网站用于选题筛选和科普策划，不替代医生诊断或治疗建议。发布视频前需要核验权威来源。
