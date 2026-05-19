# 上线和投入使用说明

## 推荐上线方式：GitHub Pages

1. 进入仓库 Settings -> Pages。
2. Source 选择 GitHub Actions。
3. 打开 Actions，运行 `Deploy site on push` 或 `Deploy site and update hotspots`。
4. 运行成功后，GitHub Pages 会给出一个可访问的网址。

项目已配置：

- push 到 main 时自动部署。
- 每 10 分钟自动更新热点数据。
- 自动构建网站。
- 自动发布到 GitHub Pages。

## 热点内容如何同步

内容源配置在：`config/sources.json`

更新脚本在：`scripts/update-hotspots.mjs`

输出数据在：`public/hotspots.json`

页面会读取 `hotspots.json`，所以只要这个文件更新，网站展示的候选热点就会同步更新。

## 当前可用能力

- 展示 5 条候选热点。
- 每条热点包含分类、标题、时间、来源、选题角度、风险提示和选题分。
- 支持每 10 分钟定时抓取新闻 RSS 后自动筛选排序。
- 保留人工审核提醒，避免健康内容未经核验直接发布。

## 投入使用前建议

- 把 `config/sources.json` 中的来源换成你认可的稳定来源。
- 每次发布视频前，打开原文来源核验。
- 对医疗建议类内容加上“不替代医生诊断”的表达。
- 后续可以增加登录、收藏、审核状态、脚本草稿和发布复盘。
