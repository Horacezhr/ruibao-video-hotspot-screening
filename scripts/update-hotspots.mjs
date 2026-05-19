import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'config', 'sources.json');
const outputPath = path.join(root, 'public', 'hotspots.json');

const config = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const fallback = JSON.parse(await fs.readFile(outputPath, 'utf8'));

function stripTags(value = '') {
  return value
    .replace(new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 'gs'), '$1')
    .replace(new RegExp('<[^>]+>', 'g'), '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

function getTag(item, tag) {
  const pattern = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  return stripTags(item.match(pattern)?.[1] || '');
}

function scoreTitle(title, tag) {
  const keywords = config.keywords || [];
  const keywordScore = keywords.reduce((score, keyword) => score + (title.includes(keyword) ? 8 : 0), 0);
  const tagScore = title.includes(tag) ? 12 : 0;
  const healthTerms = ['儿童', '儿科', '宝宝', '孩子', '益生菌', '保健', '发育', '营养', '疫苗', '感染'];
  const healthScore = healthTerms.some((term) => title.includes(term)) ? 20 : 0;
  return Math.min(99, 50 + keywordScore + tagScore + healthScore);
}

function makeAngle(_title, tag) {
  const angles = {
    益生菌: '拆解适用场景、常见误区和证据边界',
    儿科: '转成家长能理解的症状观察和就医判断',
    保健: '提炼成家庭可执行的日常管理清单',
    发育: '按年龄段整理筛查重点和行动建议',
  };
  return angles[tag] || '提炼成视频号可讲的科普选题';
}

function makeRisk(tag) {
  if (tag === '益生菌') return '需说明适用边界，避免产品化承诺';
  if (tag === '儿科') return '不替代医生诊断，避免给出个体治疗方案';
  return '发布前核验权威来源，避免制造焦虑';
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { 'user-agent': 'ruibao-hotspot-screening/1.0' },
  });
  if (!response.ok) throw new Error(feed.name + ': HTTP ' + response.status);

  const xml = await response.text();
  const itemPattern = new RegExp('<item[\\s\\S]*?<\\/item>', 'gi');

  return [...xml.matchAll(itemPattern)]
    .map(([item]) => {
      const title = getTag(item, 'title');
      const sourceUrl = getTag(item, 'link');
      const pubDate = getTag(item, 'pubDate');
      const summary = getTag(item, 'description');

      return {
        tag: feed.tag,
        title,
        time: pubDate ? new Date(pubDate).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '刚刚',
        sourceName: feed.name,
        sourceUrl,
        summary,
        angle: makeAngle(title, feed.tag),
        score: scoreTitle(title, feed.tag),
        risk: makeRisk(feed.tag),
      };
    })
    .filter((item) => item.title);
}

const collected = [];
const failures = [];

for (const feed of config.feeds || []) {
  try {
    collected.push(...(await fetchFeed(feed)));
  } catch (error) {
    failures.push(error.message);
  }
}

const seen = new Set();
const hotspots = collected
  .filter((item) => {
    const key = item.title.replace(new RegExp('\\s+', 'g'), '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

const output = {
  ...fallback,
  updatedAt: new Date().toISOString(),
  hotspots: hotspots.length ? hotspots : fallback.hotspots,
  updateStatus: {
    ok: hotspots.length > 0,
    failures,
    fetchedCount: collected.length,
  },
};

await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log('Updated ' + output.hotspots.length + ' hotspots. Fetched: ' + collected.length + '. Failures: ' + failures.length + '.');
