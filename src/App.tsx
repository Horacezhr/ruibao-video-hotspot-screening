import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, ExternalLink, HeartPulse, Search, ShieldCheck, Sparkles, Target, TrendingUp, Video } from 'lucide-react';

type Hotspot = {
  tag: string;
  title: string;
  time: string;
  sourceName?: string;
  sourceUrl?: string;
  summary?: string;
  angle?: string;
  score?: number;
  risk?: string;
};

type UpdateStatus = {
  ok?: boolean;
  isFallback?: boolean;
  failures?: string[];
  pendingSources?: string[];
  fetchedCount?: number;
  sourceCount?: number;
};

type HotspotData = {
  updatedAt: string;
  title: string;
  subtitle: string;
  description: string;
  categories: string[];
  hotspots: Hotspot[];
  workflow: string[];
  disclaimer: string;
  updateStatus?: UpdateStatus;
};

const fallbackData: HotspotData = {
  updatedAt: new Date().toISOString(),
  title: '睿宝视频号热点筛选',
  subtitle: '儿童健康内容热点筛选看板',
  description: '从指定机构、医院、育儿账号和儿童健康内容源中筛出适合视频号表达的选题，兼顾热度、可信度、家长关心程度和内容风险。',
  categories: ['儿科热点', '益生菌话题', '儿童保健', '儿童健康', '选题追踪', '内容审核'],
  hotspots: [
    {
      tag: '儿科',
      title: '儿童呼吸道感染进入高关注期，适合做家庭护理和就诊判断选题',
      time: '2 小时前',
      sourceName: '示例选题池',
      sourceUrl: '',
      summary: '围绕近期儿童呼吸道感染关注度上升，适合整理家庭观察、就医判断和护理误区。',
      angle: '家长如何判断居家观察还是就医',
      score: 92,
      risk: '需避免替代医生诊断',
    },
  ],
  workflow: ['来源抓取与 RSS 生成', '可信来源与医学依据核验', '视频号选题评分与排序', '脚本草稿与发布复盘'],
  disclaimer: '健康内容仅用于选题筛选和科普策划，不替代医生诊断或治疗建议。发布前应核验权威来源。',
  updateStatus: {
    ok: false,
    isFallback: true,
    failures: ['当前为示例数据：等待 RSSHub 或官方网站 RSS 源成功抓取后替换。'],
    fetchedCount: 0,
    sourceCount: 10,
  },
};

const categoryDescriptions = [
  '归类儿科相关内容，判断视频号选题价值。',
  '整理益生菌研究动态、产品监管、适用场景和风险提醒。',
  '覆盖发育、睡眠、营养、运动、口腔和视力等日常主题。',
  '承接综合热点、疾病预防、季节提醒和家庭护理内容。',
  '记录热点来源、热度变化、推荐角度和发布状态。',
  '标注医学依据、风险等级和不适合传播的表达。',
];

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '待更新';
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [data, setData] = useState<HotspotData>(fallbackData);
  const [isLiveData, setIsLiveData] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('./hotspots.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('hotspot data unavailable');
        return response.json() as Promise<HotspotData>;
      })
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setIsLiveData(true);
        setSelectedIndex(0);
      })
      .catch(() => {
        if (active) setIsLiveData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updatedAt = useMemo(() => formatUpdatedAt(data.updatedAt), [data.updatedAt]);
  const categories = data.categories.length ? data.categories : fallbackData.categories;
  const hotspots = data.hotspots.length ? data.hotspots.slice(0, 12) : fallbackData.hotspots;
  const selectedHotspot = hotspots[selectedIndex] || hotspots[0];

  return (
    <main className="min-h-screen bg-[#fbfbf7] text-[#18221d]">
      <header className="sticky top-0 z-10 border-b border-[#e6ebe4] bg-[#fbfbf7]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a className="flex items-center gap-2 font-semibold" href="./">
            <span className="grid size-8 place-items-center rounded-md bg-[#176f5d] text-white"><Video size={17} /></span>
            {data.title}
          </a>
          <nav className="hidden items-center gap-7 text-sm text-[#66736b] md:flex">
            {categories.slice(0, 4).map((category) => <a className="transition hover:text-[#18221d]" href="#topics" key={category}>{category}</a>)}
          </nav>
          <a className="inline-flex size-9 items-center justify-center rounded-md border border-[#d7dfd8] bg-white transition hover:border-[#9fb1a6]" href="#recent" aria-label="搜索内容">
            <Search size={17} />
          </a>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#176f5d]"><TrendingUp size={16} />{data.subtitle}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl md:text-6xl">{data.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f6c64] sm:text-lg">{data.description}</p>
          {data.updateStatus?.isFallback ? (
            <div className="mt-6 rounded-lg border border-[#f1dfd0] bg-[#fff9f4] p-4 text-sm leading-7 text-[#6f4c2d]">
              当前展示的是示例数据，自动更新源尚未成功抓取到带原文链接的内容。
              {data.updateStatus.pendingSources?.length ? ` 待补充或核验来源：${data.updateStatus.pendingSources.slice(0, 4).join('、')}。` : null}
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className="inline-flex items-center justify-center gap-2 rounded-md bg-[#18221d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3831]" href="#recent">
              查看候选热点<ArrowRight size={16} />
            </a>
            <a className="inline-flex items-center justify-center rounded-md border border-[#d7dfd8] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#9fb1a6]" href="#sources">
              筛选流程
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]" id="recent">
        <aside className="rounded-lg border border-[#e1e8e2] bg-white/80 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a978e]">Candidates</p>
              <h2 className="mt-1 text-lg font-semibold">候选热点</h2>
              <p className="mt-1 text-xs text-[#8a978e]">{isLiveData ? '已同步' : '本地预览'} · {updatedAt}</p>
            </div>
            <span className="rounded-md bg-[#eef6f1] px-2.5 py-1 text-xs font-semibold text-[#176f5d]">{hotspots.length} 条</span>
          </div>
          <div className="space-y-2">
            {hotspots.map((item, index) => (
              <button
                className={`w-full rounded-lg border p-3 text-left transition ${selectedIndex === index ? 'border-[#176f5d] bg-[#f2f8f4]' : 'border-[#edf1ec] bg-white hover:border-[#b7c8bd] hover:bg-[#fbfdf9]'}`}
                key={`${item.title}-${index}`}
                onClick={() => setSelectedIndex(index)}
                type="button"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-[#8a978e]">
                  <span className="font-semibold text-[#176f5d]">0{index + 1} · {item.tag}</span>
                  <span>{item.time}</span>
                </div>
                <h3 className="text-sm font-semibold leading-6 text-[#243028]">{item.title}</h3>
                {item.score ? <p className="mt-1.5 text-xs text-[#8a978e]">选题分：{item.score}</p> : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-lg border border-[#e1e8e2] bg-white p-5 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#eef6f1] px-2.5 py-1 text-xs font-semibold text-[#176f5d]">{selectedHotspot.tag}</span>
            <span className="text-xs text-[#8a978e]">{selectedHotspot.time}</span>
            {selectedHotspot.score ? <span className="text-xs text-[#8a978e]">选题分 {selectedHotspot.score}</span> : null}
          </div>
          <h2 className="text-2xl font-semibold leading-9">{selectedHotspot.title}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#edf1ec] bg-[#fbfdf9] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a978e]">来源核验</p>
              <p className="mt-2 text-sm font-semibold">{selectedHotspot.sourceName || '暂无来源名称'}</p>
              {selectedHotspot.sourceUrl ? (
                <a className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#18221d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2b3831]" href={selectedHotspot.sourceUrl} rel="noreferrer" target="_blank">
                  打开新闻原文<ExternalLink size={15} />
                </a>
              ) : <p className="mt-3 text-sm leading-6 text-[#657168]">暂无原文链接，建议人工补充来源后再使用。</p>}
            </div>
            <div className="rounded-lg border border-[#edf1ec] bg-[#fbfdf9] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a978e]">视频号角度</p>
              <p className="mt-2 text-sm leading-6 text-[#243028]">{selectedHotspot.angle || '暂无推荐角度，可先从家长最关心的问题切入。'}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#edf1ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a978e]">原文摘要</p>
            <p className="mt-2 text-sm leading-7 text-[#4f5e55]">{selectedHotspot.summary || '暂无摘要，建议打开来源核验。'}</p>
          </div>
          <div className="mt-4 rounded-lg border border-[#f1dfd0] bg-[#fff9f4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6682d]">风险提示</p>
            <p className="mt-2 text-sm leading-7 text-[#6f4c2d]">{selectedHotspot.risk || '发布前需要核验权威来源，避免把科普内容表达成诊疗建议。'}</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#8a978e]">{data.disclaimer}</p>
        </section>
      </section>

      <section className="border-y border-[#e6ebe4] bg-white py-12" id="topics">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-[#176f5d]">Screening</p><h2 className="mt-2 text-2xl font-semibold">筛选维度</h2></div>
            <BarChart3 className="hidden text-[#176f5d] sm:block" size={26} />
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-[#e6ebe4] bg-[#e6ebe4] sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <a className="bg-white p-5 transition hover:bg-[#f7faf6]" href="#recent" key={category}>
                <Target className="mb-4 text-[#176f5d]" size={21} />
                <h3 className="font-semibold">{category}</h3>
                <p className="mt-2 text-sm leading-6 text-[#657168]">{categoryDescriptions[index] || '用于归类热点、判断选题价值，并保留来源、风险和视频表达建议。'}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]" id="sources">
        <div>
          <p className="text-sm font-semibold text-[#176f5d]">Workflow</p>
          <h2 className="mt-2 text-2xl font-semibold">每日热点筛选流程</h2>
          <p className="mt-3 leading-7 text-[#657168]">通过 RSSHub 和官方网站 RSS 源抓取内容，形成每 10 分钟更新的视频号选题池。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.workflow.map((item, index) => {
            const icons = [TrendingUp, ShieldCheck, Sparkles, HeartPulse];
            const Icon = icons[index] || Sparkles;
            return <article className="rounded-lg border border-[#e1e8e2] bg-white p-5" key={item}><Icon className="mb-4 text-[#176f5d]" size={22} /><h3 className="font-semibold">{item}</h3><p className="mt-2 text-sm leading-6 text-[#657168]">保留热度、可信来源、目标受众、视频角度和风险提示，方便后续制作脚本。</p></article>;
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
