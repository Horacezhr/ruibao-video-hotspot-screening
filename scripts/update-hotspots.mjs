import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'config', 'sources.json');
const outputPath = path.join(root, 'public', 'hotspots.json');

const config = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const fallback = JSON.parse(await fs.readFile(outputPath, 'utf8'));

const rsshubInstances = config.rsshubInstances?.length ? config.rsshubInstances : ['https://rsshub.app'];
const requestTimeoutMs = config.requestTimeoutMs || 12000;

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value = '') {
  return decodeEntities(value)
    .replace(new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 'gs'), '$1')
    .replace(new RegExp('<[^>]+>', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTag(item, tag) {
  const pattern = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  return stripTags(item.match(pattern)?.[1] || '');
}

function getRawTag(item, tag) {
  const pattern = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  return item.match(pattern)?.[1] || '';
}

function normalizeUrl(value = '') {
  const decoded = decodeEntities(value.trim());
  if (!decoded) return '';
  try {
    const url = new URL(decoded);
    return url.href;
  } catch {
    return decoded.startsWith('http') ? decoded : '';
  }
}

function getLink(item) {
  const link = normalizeUrl(getTag(item, 'link'));
  if (link) return link;

  const guid = normalizeUrl(getTag(item, 'guid'));
  if (guid) return guid;

  const atomLink = item.match(/<atom:link[^>]+href=["']([^"']+)["']/i)?.[1] || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '';
  return normalizeUrl(atomLink);
}

function scoreTitle(title, tag) {
  const keywords = config.keywords || [];
  const keywordScore = keywords.reduce((score, keyword) => score + (title.includes(keyword) ? 8 : 0), 0);
  const tagScore = title.includes(tag) ? 12 : 0;
  const sourceScore = ['国家卫生健康委', '儿童医院', '儿科研究所', '妇幼'].some((term) => title.includes(term)) ? 8 : 0;
  return Math.min(99, 48 + keywordScore + tagScore + sourceScore);
}

function makeAngle(title, tag) {
  if (tag === '益生菌') return '拆解适用场景、证据边界和产品化表达风险';
  if (tag === '辅食') return '转成不同月龄家庭可执行的辅食提醒';
  if (tag === '营养') return '提炼成儿童营养补充和日常饮食误区';
  if (tag === '儿科') return '转成家长能理解的症状观察和就医判断';
  if (title.includes('通知') || title.includes('指南')) return '做成家长需要知道的权威提醒';
  return '提炼成视频号可讲的儿童健康科普选题';
}

function makeRisk(tag) {
  if (tag === '益生菌') return '需说明适用边界，避免产品功效承诺';
  if (tag === '辅食' || tag === '营养') return '避免替代个体化营养评估，特殊儿童需咨询医生';
  return '发布前核验权威来源，不替代医生诊断或治疗建议';
}

function sourceUrls(source) {
  if (source.type === 'rss' && source.rssUrl) return [source.rssUrl];
  if (source.type === 'website' && source.rssUrl) return [source.rssUrl];
  if (source.type === 'wechat-rsshub-sogou' && source.accountId) {
    return rsshubInstances.map((instance) => `${instance.replace(/\/$/, '')}/wechat/sogou/${encodeURIComponent(source.accountId)}`);
  }
  return [];
}

function resolveUrl(baseUrl, href = '') {
  const decoded = decodeEntities(href.trim());
  if (!decoded || decoded.startsWith('#') || decoded.startsWith('javascript:')) return '';
  try {
    return new URL(decoded, baseUrl).href;
  } catch {
    return '';
  }
}

function parseWebsite(html, source) {
  const keywords = config.keywords || [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  return [...html.matchAll(anchorPattern)]
    .map((match) => {
      const sourceUrl = resolveUrl(source.officialUrl, match[1]);
      const title = stripTags(match[2]);
      return {
        tag: source.tag,
        title,
        time: '官网最新',
        sourceName: source.name,
        sourceUrl,
        summary: title ? `来自${source.name}官网栏目，发布前建议打开原文核验。` : '',
        angle: makeAngle(title, source.tag),
        score: scoreTitle(title, source.tag),
        risk: makeRisk(source.tag),
      };
    })
    .filter((item) => item.title.length >= 6 && item.sourceUrl)
    .filter((item) => keywords.some((keyword) => item.title.includes(keyword)) || ['妇幼', '儿科'].includes(source.tag))
    .slice(0, 8);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ruibao-video-hotspot-screening/1.0 (+https://github.com/Horacezhr/ruibao-video-hotspot-screening)',
        accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时');
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.text();
}

function parseFeed(xml, source) {
  const itemPattern = new RegExp('<item[\\s\\S]*?<\\/item>|<entry[\\s\\S]*?<\\/entry>', 'gi');

  return [...xml.matchAll(itemPattern)]
    .map(([item]) => {
      const title = getTag(item, 'title');
      const sourceUrl = getLink(item);
      const pubDate = getTag(item, 'pubDate') || getTag(item, 'updated') || getTag(item, 'published');
      const summary = getTag(item, 'description') || getTag(item, 'summary') || stripTags(getRawTag(item, 'content:encoded'));

      return {
        tag: source.tag,
        title,
        time: pubDate ? new Date(pubDate).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '刚刚',
        sourceName: source.name,
        sourceUrl,
        summary,
        angle: makeAngle(title, source.tag),
        score: scoreTitle(title, source.tag),
        risk: makeRisk(source.tag),
      };
    })
    .filter((item) => item.title && item.sourceUrl);
}

async function fetchSource(source) {
  if (source.type === 'website' && !source.rssUrl && source.officialUrl) {
    const html = await fetchText(source.officialUrl);
    const items = parseWebsite(html, source);
    if (items.length) return items;
    throw new Error(source.name + ': 官网未解析到可用链接');
  }

  const urls = sourceUrls(source);
  if (!urls.length) {
    throw new Error(source.name + ': 未配置可抓取 RSS 地址或公众号 accountId');
  }

  const errors = [];
  for (const url of urls) {
    try {
      const xml = await fetchText(url);
      const items = parseFeed(xml, source);
      if (items.length) return items;
      errors.push(url + ': 没有解析到带原文链接的条目');
    } catch (error) {
      errors.push(url + ': ' + error.message);
    }
  }

  throw new Error(source.name + ': ' + errors.join('；'));
}

const sources = config.sources || config.feeds || [];
const results = await Promise.allSettled(sources.map((source) => fetchSource(source)));
const collected = [];
const failures = [];
const pendingSources = [];

results.forEach((result, index) => {
  const source = sources[index];
  if (result.status === 'fulfilled') {
    collected.push(...result.value);
    return;
  }

  const message = result.reason?.message || String(result.reason);
  failures.push(message);
  if (message.includes('未配置')) pendingSources.push(source.name);
});

const seen = new Set();
const hotspots = collected
  .filter((item) => {
    const key = (item.sourceUrl || item.title).replace(/\s+/g, '');
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
    isFallback: hotspots.length === 0,
    failures,
    pendingSources,
    fetchedCount: collected.length,
    sourceCount: sources.length,
  },
};

await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log('Updated ' + output.hotspots.length + ' hotspots. Fetched: ' + collected.length + '. Failures: ' + failures.length + '.');
