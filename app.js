const fallbackTokens = [
  {
    pair: "WIF / SOL",
    symbol: "WIF",
    chain: "solana",
    dex: "raydium",
    price: 2.84,
    change: 18.4,
    volume: 18400000,
    liquidity: 52800000,
    marketCap: 2810000000,
    tokenAddress: "demo-sol-wif",
    age: "老牌",
    tags: ["dog", "solana", "bluechip"],
  },
  {
    pair: "BRETT / WETH",
    symbol: "BRETT",
    chain: "base",
    dex: "uniswap",
    price: 0.092,
    change: 11.8,
    volume: 9400000,
    liquidity: 24600000,
    marketCap: 920000000,
    tokenAddress: "demo-base-brett",
    age: "强势",
    tags: ["base", "community"],
  },
  {
    pair: "PEPE / WETH",
    symbol: "PEPE",
    chain: "ethereum",
    dex: "uniswap",
    price: 0.000014,
    change: -4.2,
    volume: 66200000,
    liquidity: 72100000,
    marketCap: 5890000000,
    tokenAddress: "demo-eth-pepe",
    age: "老牌",
    tags: ["eth", "frog"],
  },
  {
    pair: "BONK / SOL",
    symbol: "BONK",
    chain: "solana",
    dex: "orca",
    price: 0.000026,
    change: 7.1,
    volume: 31800000,
    liquidity: 40800000,
    marketCap: 2140000000,
    tokenAddress: "demo-sol-bonk",
    age: "强势",
    tags: ["solana", "dog"],
  },
  {
    pair: "TOSHI / WETH",
    symbol: "TOSHI",
    chain: "base",
    dex: "baseswap",
    price: 0.00042,
    change: 23.3,
    volume: 3900000,
    liquidity: 8100000,
    marketCap: 176000000,
    tokenAddress: "demo-base-toshi",
    age: "异动",
    tags: ["base", "cat"],
  },
  {
    pair: "FLOKI / WBNB",
    symbol: "FLOKI",
    chain: "bsc",
    dex: "pancakeswap",
    price: 0.00021,
    change: 5.6,
    volume: 27800000,
    liquidity: 35700000,
    marketCap: 2050000000,
    tokenAddress: "demo-bsc-floki",
    age: "老牌",
    tags: ["bsc", "dog"],
  },
];

const fallbackNews = [
  {
    title: "Solana meme 板块成交量回升，短线资金偏好高流动性池子",
    source: "Radar Desk",
    time: "刚刚",
    impact: "中",
    keywords: ["solana", "WIF", "BONK"],
  },
  {
    title: "Base 生态新增社群活动，BRETT 与 TOSHI 讨论热度上行",
    source: "Radar Desk",
    time: "8 分钟前",
    impact: "高",
    keywords: ["base", "BRETT", "TOSHI"],
  },
  {
    title: "ETH 主网 meme 池子 gas 成本抬升，大额交易更集中",
    source: "Radar Desk",
    time: "14 分钟前",
    impact: "低",
    keywords: ["ethereum", "PEPE"],
  },
];

const state = {
  tokens: [],
  news: [],
  selected: null,
  chain: "all",
  sort: "heat",
  query: "",
  paused: false,
  heatThreshold: 72,
  lastSync: null,
  watchlist: new Set(JSON.parse(localStorage.getItem("yingying-watchlist") || "[]")),
  trackedAddresses: new Set(JSON.parse(localStorage.getItem("yingying-token-addresses") || "[]")),
};

const els = {
  tokenList: document.querySelector("#tokenList"),
  eventFeed: document.querySelector("#eventFeed"),
  newsFeed: document.querySelector("#newsFeed"),
  trackedPairs: document.querySelector("#trackedPairs"),
  pairDelta: document.querySelector("#pairDelta"),
  hotSignals: document.querySelector("#hotSignals"),
  avgRisk: document.querySelector("#avgRisk"),
  newsCatalysts: document.querySelector("#newsCatalysts"),
  selectedName: document.querySelector("#selectedName"),
  selectedSummary: document.querySelector("#selectedSummary"),
  radarCanvas: document.querySelector("#radarCanvas"),
  searchInput: document.querySelector("#searchInput"),
  refreshButton: document.querySelector("#refreshButton"),
  pauseStream: document.querySelector("#pauseStream"),
  heatThreshold: document.querySelector("#heatThreshold"),
  heatValue: document.querySelector("#heatValue"),
  desktopAlerts: document.querySelector("#desktopAlerts"),
  newsStatus: document.querySelector("#newsStatus"),
  watchlist: document.querySelector("#watchlist"),
  tokenAddForm: document.querySelector("#tokenAddForm"),
  tokenAddressInput: document.querySelector("#tokenAddressInput"),
  trackedAddresses: document.querySelector("#trackedAddresses"),
  riskStatus: document.querySelector("#riskStatus"),
  riskDetail: document.querySelector("#riskDetail"),
};

function tokenKey(token) {
  return `${token.chain}:${token.tokenAddress || token.symbol}`.toLowerCase();
}

function isWatched(token) {
  return state.watchlist.has(tokenKey(token)) || state.watchlist.has(token.symbol);
}

function shortAddress(address) {
  if (!address) return "未知";
  if (address.startsWith("demo-")) return "演示地址";
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatCompact(value) {
  if (!Number.isFinite(value)) return "-";
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1 ? 1 : 4,
  }).format(value);
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";
  if (value < 0.001) return `$${value.toExponential(2)}`;
  if (value < 1) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(3)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function looksLikeTokenAddress(value) {
  const text = value.trim();
  return text.length >= 32 && /^[a-zA-Z0-9:_-]+$/.test(text);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreToken(token) {
  const changeScore = clamp(32 + token.change * 1.6, 0, 62);
  const volumeScore = clamp((Math.log10(Math.max(token.volume, 1)) - 4) * 8, 0, 34);
  const liquidityScore = clamp((Math.log10(Math.max(token.liquidity, 1)) - 4) * 10, 0, 48);
  const agePenalty = token.age === "新池" ? 12 : token.age === "异动" ? 5 : 0;
  const heat = Math.round(clamp(changeScore + volumeScore + agePenalty, 0, 100));
  const risk = Math.round(clamp(82 - liquidityScore + agePenalty - Math.min(token.volume / 2500000, 12), 5, 96));
  const momentum = Math.round(clamp(45 + token.change * 1.8 + volumeScore * 0.7, 0, 100));
  const catalyst = newsMatches(token).length * 18;
  return {
    heat,
    risk,
    momentum,
    catalyst: clamp(catalyst, 0, 100),
  };
}

function newsMatches(token) {
  const haystack = `${token.symbol} ${token.pair} ${token.chain} ${token.tags.join(" ")}`.toLowerCase();
  return state.news.filter((item) =>
    item.keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase())),
  );
}

function decorateToken(token) {
  const scores = scoreToken(token);
  return { ...token, ...scores };
}

async function fetchDexPairs() {
  const localResponse = await fetch("/api/market", { cache: "no-store" }).catch(() => null);
  if (localResponse?.ok) {
    const payload = await localResponse.json();
    const mapped = mapDexPairs(payload.pairs || []);
    if (mapped.length) return mapped;
  }

  const endpoints = [
    "https://api.dexscreener.com/latest/dex/search?q=solana%20meme",
    "https://api.dexscreener.com/latest/dex/search?q=base%20meme",
    "https://api.dexscreener.com/latest/dex/search?q=pepe",
  ];

  const results = await Promise.allSettled(
    endpoints.map((url) => fetch(url, { cache: "no-store" }).then((res) => res.json())),
  );

  const pairs = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value?.pairs || [])
    .filter((pair) => pair.baseToken?.symbol && pair.priceUsd)
    .slice(0, 28);

  if (!pairs.length) return null;

  return mapDexPairs(pairs);
}

async function fetchTrackedTokens() {
  const addresses = [...state.trackedAddresses];
  if (!addresses.length) return [];

  const results = await Promise.allSettled(
    addresses.map((address) =>
      fetch(`/api/token?address=${encodeURIComponent(address)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { pairs: [] }))
        .then((payload) => mapDexPairs(payload.pairs || [], address)),
    ),
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .map((token) => ({ ...token, source: "manual", age: token.age === "新池" ? "新池" : "手动盯盘" }));
}

function mapDexPairs(pairs, trackedAddress = "") {
  const seen = new Set();
  const normalizedTracked = trackedAddress.toLowerCase();
  return pairs
    .filter((pair) => {
      const key = `${pair.chainId}:${pair.baseToken.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((pair) => ({
      pair: `${pair.baseToken.symbol} / ${pair.quoteToken?.symbol || "USD"}`,
      symbol: pair.baseToken.symbol,
      chain: String(pair.chainId || "unknown").toLowerCase(),
      dex: pair.dexId || "dex",
      price: Number(pair.priceUsd),
      change: Number(pair.priceChange?.h24 || pair.priceChange?.h6 || 0),
      volume: Number(pair.volume?.h24 || pair.volume?.h6 || 0),
      liquidity: Number(pair.liquidity?.usd || 0),
      marketCap: Number(pair.marketCap || pair.fdv || 0),
      tokenAddress: pair.baseToken.address,
      age: pair.pairCreatedAt && Date.now() - pair.pairCreatedAt < 1000 * 60 * 60 * 24 ? "新池" : "追踪",
      tags: [pair.chainId, pair.dexId, pair.baseToken.name, normalizedTracked ? "manual" : ""].filter(Boolean),
      url: pair.url,
    }));
}

async function fetchNews() {
  try {
    const response = await fetch("/api/news", {
      cache: "no-store",
    });
    const payload = await response.json();
    const items = (payload.Data || []).slice(0, 8).map((item) => ({
      title: item.title,
      source: item.source_info?.name || item.source || "Crypto",
      time: new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" }).format(
        Math.round((Number(item.published_on) * 1000 - Date.now()) / 60000),
        "minute",
      ),
      impact: item.categories?.includes("Market") ? "高" : "中",
      keywords: String(`${item.title} ${item.categories}`)
        .split(/\W+/)
        .filter((word) => word.length > 2)
        .slice(0, 12),
      url: item.url,
    }));
    return items.length ? items : fallbackNews;
  } catch {
    return fallbackNews;
  }
}

function filteredTokens() {
  const q = state.query.trim().toLowerCase();
  return state.tokens
    .filter((token) => state.chain === "all" || token.chain.includes(state.chain))
    .filter((token) => {
      if (!q) return true;
      return `${token.pair} ${token.chain} ${token.dex} ${token.tokenAddress || ""} ${token.tags.join(" ")}`
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (state.sort === "watch") return Number(isWatched(b)) - Number(isWatched(a)) || b.heat - a.heat;
      if (state.sort === "risk") return b.risk - a.risk;
      if (state.sort === "volume") return b.volume - a.volume;
      return b.heat - a.heat;
    });
}

function renderTokens() {
  const tokens = filteredTokens();
  els.tokenList.innerHTML = "";

  if (!tokens.length) {
    els.tokenList.innerHTML = '<div class="empty">没有匹配的信号</div>';
    return;
  }

  tokens.forEach((token) => {
    const row = document.createElement("button");
    const key = tokenKey(token);
    row.className = `token-row ${state.selected && tokenKey(state.selected) === key ? "selected" : ""}`;
    row.type = "button";
    row.dataset.key = key;
    const scoreClass = token.heat >= 78 ? "score-hot" : token.heat >= 58 ? "score-watch" : "score-calm";
    row.innerHTML = `
      <span class="token-icon">${token.symbol.slice(0, 1).toUpperCase()}</span>
      <span class="watch-button ${isWatched(token) ? "active" : ""}" data-watch="${key}" title="自选">★</span>
      <span class="token-name">
        <strong>${token.pair}</strong>
        <span>${token.chain} · ${token.dex} · ${token.source === "manual" ? "手动盯盘" : token.age}</span>
        <span class="address-line" title="${token.tokenAddress || ""}">Token ${shortAddress(token.tokenAddress)}</span>
      </span>
      <span class="token-stat"><span>价格</span><strong>${formatPrice(token.price)}</strong></span>
      <span class="token-stat"><span>24h</span><strong>${formatPercent(token.change)}</strong></span>
      <span class="token-stat"><span>成交</span><strong>$${formatCompact(token.volume)}</strong></span>
      <span class="token-stat"><span>风险</span><strong>${token.risk}</strong></span>
      <span class="score-pill ${scoreClass}">${token.heat}</span>
    `;
    row.addEventListener("click", (event) => {
      const watchButton = event.target.closest("[data-watch]");
      if (watchButton) {
        event.stopPropagation();
        toggleWatch(key, token.symbol);
        return;
      }
      const addressLine = event.target.closest(".address-line");
      if (addressLine) {
        event.stopPropagation();
        copyTokenAddress(token);
        return;
      }
      selectToken(key);
    });
    els.tokenList.appendChild(row);
  });
}

async function copyTokenAddress(token) {
  if (!token.tokenAddress || token.tokenAddress.startsWith("demo-")) {
    addEvent("risk", `${token.symbol} 暂无真实 Token`, "演示数据没有可复制的链上地址");
    return;
  }
  await navigator.clipboard.writeText(token.tokenAddress).catch(() => {});
  addEvent("hot", `${token.symbol} Token 已复制`, token.tokenAddress);
}

function renderWatchlist() {
  const watched = [...state.watchlist].filter((key) =>
    state.tokens.some((token) => tokenKey(token) === key || token.symbol === key),
  );
  if (!watched.length) {
    els.watchlist.textContent = "暂无自选";
    return;
  }
  els.watchlist.innerHTML = "";
  watched.forEach((key) => {
    const token = state.tokens.find((item) => tokenKey(item) === key || item.symbol === key);
    const chip = document.createElement("button");
    chip.className = "watch-chip";
    chip.type = "button";
    chip.textContent = token?.symbol || key;
    chip.addEventListener("click", () => selectToken(key));
    els.watchlist.appendChild(chip);
  });
}

function renderTrackedAddresses() {
  const addresses = [...state.trackedAddresses];
  if (!addresses.length) {
    els.trackedAddresses.textContent = "暂无手动盯盘";
    return;
  }

  els.trackedAddresses.innerHTML = "";
  addresses.forEach((address) => {
    const item = document.createElement("span");
    item.className = "tracked-chip";
    item.innerHTML = `
      <button type="button" data-focus-address="${address}" title="${address}">${shortAddress(address)}</button>
      <button type="button" data-remove-address="${address}" title="移除">×</button>
    `;
    els.trackedAddresses.appendChild(item);
  });
}

function renderMetrics() {
  const tokens = filteredTokens();
  const hot = tokens.filter((token) => token.heat >= state.heatThreshold).length;
  const avgRisk = Math.round(tokens.reduce((sum, token) => sum + token.risk, 0) / Math.max(tokens.length, 1));
  const catalysts = tokens.filter((token) => newsMatches(token).length).length;

  els.trackedPairs.textContent = String(tokens.length);
  els.hotSignals.textContent = String(hot);
  els.avgRisk.textContent = String(avgRisk);
  els.newsCatalysts.textContent = String(catalysts);
  els.pairDelta.textContent = state.lastSync
    ? `同步 ${state.lastSync.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
    : "等待同步";
}

function renderNews() {
  els.newsFeed.innerHTML = "";
  state.news.forEach((item) => {
    const node = document.createElement(item.url ? "a" : "article");
    node.className = "news-item";
    if (item.url) {
      node.href = item.url;
      node.target = "_blank";
      node.rel = "noreferrer";
    }
    node.innerHTML = `
      <strong>${item.title}</strong>
      <p>${item.keywords.slice(0, 4).join(" · ")}</p>
      <span class="news-meta"><span>${item.source}</span><span>影响 ${item.impact} · ${item.time}</span></span>
    `;
    els.newsFeed.appendChild(node);
  });
}

function addEvent(type, title, detail) {
  if (state.paused) return;
  const item = document.createElement("article");
  item.className = `event-item ${type}`;
  item.innerHTML = `
    <span class="event-dot"></span>
    <span><strong>${title}</strong><p>${detail}</p></span>
    <span class="event-time">${new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}</span>
  `;
  els.eventFeed.prepend(item);
  while (els.eventFeed.children.length > 12) els.eventFeed.lastElementChild.remove();
}

function toggleWatch(key, label = key) {
  if (state.watchlist.has(key)) {
    state.watchlist.delete(key);
    addEvent("news", `${label} 移出自选`, "本地自选已更新");
  } else {
    state.watchlist.add(key);
    addEvent("hot", `${label} 加入自选`, "后续异动会更醒目");
  }
  localStorage.setItem("yingying-watchlist", JSON.stringify([...state.watchlist]));
  renderAll();
}

function renderRiskDetail(token) {
  const liquidityOk = token.liquidity >= 50000;
  const volumeRatio = token.volume / Math.max(token.liquidity, 1);
  const ratioOk = volumeRatio <= 8;
  const marketCapOk = token.marketCap >= 100000;
  const riskLabel = token.risk >= 76 ? "高风险" : token.risk >= 54 ? "观察" : "相对稳";

  els.riskStatus.textContent = riskLabel;
  els.riskStatus.className = `status-pill ${token.risk >= 76 ? "danger" : token.risk >= 54 ? "warn" : "safe"}`;
  els.riskDetail.innerHTML = `
    <div class="risk-grid">
      <span><small>流动性</small><strong>$${formatCompact(token.liquidity)}</strong></span>
      <span><small>成交/流动</small><strong>${volumeRatio.toFixed(1)}x</strong></span>
      <span><small>市值/FDV</small><strong>$${formatCompact(token.marketCap)}</strong></span>
      <span><small>24h 动量</small><strong>${formatPercent(token.change)}</strong></span>
    </div>
    <ul class="risk-list">
      <li class="${liquidityOk ? "ok" : "bad"}">${liquidityOk ? "流动性够用" : "流动性偏薄，进出可能滑点大"}</li>
      <li class="${ratioOk ? "ok" : "bad"}">${ratioOk ? "成交和池子比例正常" : "成交/流动性过高，短线波动会很凶"}</li>
      <li class="${marketCapOk ? "ok" : "bad"}">${marketCapOk ? "基础规模不是纯尘埃盘" : "规模很小，只适合极小仓观察"}</li>
      <li class="${token.tokenAddress && !token.tokenAddress.startsWith("demo-") ? "ok" : "bad"}">买前务必再次核对合约地址</li>
    </ul>
    <div class="risk-actions">
      ${token.url ? `<a href="${token.url}" target="_blank" rel="noreferrer">打开 DexScreener</a>` : ""}
      <button type="button" data-copy-selected>复制合约</button>
    </div>
  `;
}

function renderDetail() {
  const token = state.selected || filteredTokens()[0];
  if (!token) return;
  state.selected = token;
  els.selectedName.textContent = `${token.pair}`;
  els.selectedSummary.textContent = `Token ${shortAddress(token.tokenAddress)} · 热度 ${token.heat} · 动量 ${token.momentum} · 风险 ${token.risk} · 新闻催化 ${token.catalyst}`;
  renderRiskDetail(token);
  drawRadar(token);
}

function drawRadar(token) {
  const canvas = els.radarCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#101416";
  ctx.fillRect(0, 0, width, height);

  const center = { x: width * 0.5, y: height * 0.42 };
  const radius = 92;
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 1;

  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, (radius * ring) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  const axes = [
    ["热度", token.heat],
    ["动量", token.momentum],
    ["流动", clamp(Math.log10(Math.max(token.liquidity, 1)) * 12, 0, 100)],
    ["新闻", token.catalyst],
    ["安全", 100 - token.risk],
  ];

  const points = axes.map(([, value], index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const pointRadius = (radius * value) / 100;
    return {
      x: center.x + Math.cos(angle) * pointRadius,
      y: center.y + Math.sin(angle) * pointRadius,
      lx: center.x + Math.cos(angle) * (radius + 22),
      ly: center.y + Math.sin(angle) * (radius + 22),
      label: axes[index][0],
    };
  });

  axes.forEach(([, value], index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "12px system-ui";
    const point = points[index];
    ctx.fillText(`${point.label} ${Math.round(value)}`, point.lx - 24, point.ly);
  });

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(200, 242, 223, .28)";
  ctx.fill();
  ctx.strokeStyle = "#c8f2df";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#c8f2df";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function selectToken(key) {
  const token = state.tokens.find((item) => tokenKey(item) === key || item.symbol === key);
  if (!token) return;
  state.selected = token;
  renderTokens();
  renderDetail();
  addEvent("news", `${token.symbol} 已聚焦`, `${token.chain} · ${token.dex} · 风险 ${token.risk}`);
}

function simulateTick() {
  if (!state.tokens.length) return;
  state.tokens = state.tokens.map((token) => {
    const drift = (Math.random() - 0.46) * 2.4;
    const next = {
      ...token,
      change: clamp(token.change + drift, -45, 85),
      volume: Math.max(12000, token.volume * (1 + (Math.random() - 0.42) * 0.05)),
      liquidity: Math.max(5000, token.liquidity * (1 + (Math.random() - 0.5) * 0.018)),
    };
    return decorateToken(next);
  });

  const candidate = state.tokens[Math.floor(Math.random() * state.tokens.length)];
  if (candidate.heat >= state.heatThreshold) {
    const prefix = isWatched(candidate) ? "自选 " : "";
    addEvent("hot", `${prefix}${candidate.symbol} 热度突破 ${candidate.heat}`, `24h ${formatPercent(candidate.change)} · 成交 $${formatCompact(candidate.volume)}`);
    notify(candidate);
  } else if (candidate.risk >= 76) {
    addEvent("risk", `${candidate.symbol} 风险升高`, `流动性 $${formatCompact(candidate.liquidity)} · 风险 ${candidate.risk}`);
  }

  if (state.selected) {
    state.selected = state.tokens.find((token) => tokenKey(token) === tokenKey(state.selected)) || state.selected;
  }
  renderAll();
}

function notify(token) {
  if (!els.desktopAlerts.checked || !("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(`嘤嘤雷达：${token.symbol} 异动`, {
    body: `热度 ${token.heat} · 24h ${formatPercent(token.change)} · 成交 $${formatCompact(token.volume)}`,
  });
}

function renderAll() {
  renderTokens();
  renderMetrics();
  renderWatchlist();
  renderTrackedAddresses();
  renderNews();
  renderDetail();
}

function mergeTokens(tokens) {
  const map = new Map();
  tokens.forEach((token) => {
    const key = tokenKey(token);
    const existing = map.get(key);
    if (!existing || token.source === "manual") map.set(key, token);
  });
  return [...map.values()];
}

async function refreshData() {
  els.refreshButton.disabled = true;
  els.newsStatus.textContent = "同步中";
  const [remoteTokens, manualTokens, news] = await Promise.all([
    fetchDexPairs().catch(() => null),
    fetchTrackedTokens().catch(() => []),
    fetchNews(),
  ]);
  state.news = news;
  state.tokens = mergeTokens([...(manualTokens || []), ...(remoteTokens || fallbackTokens)]).map(decorateToken);
  state.lastSync = new Date();
  if (!state.selected) state.selected = state.tokens[0];
  els.newsStatus.textContent = remoteTokens ? "实时" : "演示";
  addEvent(remoteTokens ? "hot" : "news", remoteTokens ? "公开行情已同步" : "使用演示数据", "接口不可用时自动保留本地信号流");
  renderAll();
  els.refreshButton.disabled = false;
}

async function addTrackedAddress(address, options = {}) {
  const normalized = address.trim();
  if (normalized.length < 16) {
    addEvent("risk", "合约地址太短", "请粘贴完整 token 合约地址");
    return;
  }
  state.trackedAddresses.add(normalized);
  localStorage.setItem("yingying-token-addresses", JSON.stringify([...state.trackedAddresses]));
  if (els.tokenAddressInput) els.tokenAddressInput.value = "";
  if (options.fromSearch) {
    state.query = "";
    els.searchInput.value = "";
  }
  addEvent("hot", "已加入合约盯盘", shortAddress(normalized));
  renderTrackedAddresses();
  await refreshData();
}

function bindEvents() {
  document.querySelector("#chainFilters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-chain]");
    if (!button) return;
    state.chain = button.dataset.chain;
    document.querySelectorAll("#chainFilters .chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    renderAll();
  });

  document.querySelector("#sortTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-sort]");
    if (!button) return;
    state.sort = button.dataset.sort;
    document.querySelectorAll("#sortTabs button").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderAll();
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderAll();
  });

  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !looksLikeTokenAddress(els.searchInput.value)) return;
    event.preventDefault();
    addTrackedAddress(els.searchInput.value, { fromSearch: true });
  });

  els.refreshButton.addEventListener("click", () => {
    if (looksLikeTokenAddress(els.searchInput.value) && !state.trackedAddresses.has(els.searchInput.value.trim())) {
      addTrackedAddress(els.searchInput.value, { fromSearch: true });
      return;
    }
    refreshData();
  });

  els.tokenAddForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTrackedAddress(els.tokenAddressInput.value);
  });

  els.trackedAddresses.addEventListener("click", (event) => {
    const focus = event.target.closest("[data-focus-address]");
    const remove = event.target.closest("[data-remove-address]");
    if (focus) {
      state.query = focus.dataset.focusAddress;
      els.searchInput.value = state.query;
      renderAll();
    }
    if (remove) {
      state.trackedAddresses.delete(remove.dataset.removeAddress);
      localStorage.setItem("yingying-token-addresses", JSON.stringify([...state.trackedAddresses]));
      addEvent("news", "已移除合约盯盘", shortAddress(remove.dataset.removeAddress));
      refreshData();
    }
  });

  els.riskDetail.addEventListener("click", (event) => {
    if (!event.target.closest("[data-copy-selected]") || !state.selected) return;
    copyTokenAddress(state.selected);
  });

  els.pauseStream.addEventListener("click", () => {
    state.paused = !state.paused;
    els.pauseStream.textContent = state.paused ? "恢复" : "暂停";
  });

  els.heatThreshold.addEventListener("input", (event) => {
    state.heatThreshold = Number(event.target.value);
    els.heatValue.textContent = String(state.heatThreshold);
    renderMetrics();
  });

  els.desktopAlerts.addEventListener("change", async () => {
    if (!els.desktopAlerts.checked || !("Notification" in window)) return;
    if (Notification.permission === "default") await Notification.requestPermission();
  });
}

bindEvents();
refreshData();
setInterval(simulateTick, 4500);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  });
}
