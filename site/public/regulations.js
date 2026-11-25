const pageSize = 30;
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
let libraryPromise;

export function renderRegulationLibrary() {
  return `<div id="regulation-library">
    <div class="page-heading">
      <div>
        <h1>규정모음집</h1>
        <p>종합금융투자사업자 업무별 조문과 발행어음·IMA의 적용 기준을 찾아보세요.</p>
      </div>
      <span id="reg-library-date" class="date-tag" hidden></span>
    </div>
    <section class="panel reg-library-panel" aria-label="종투사 규정 조회">
      <p id="reg-library-loading" role="status">조문을 불러오는 중입니다.</p>
      <button id="reg-library-retry" type="button" class="btn" hidden>다시 불러오기</button>
      <div id="reg-library-content" hidden>
        <div class="lens-switch" role="group" aria-label="규정 조회 방식">
          <button type="button" class="lens-btn active" data-reg-mode="articles" aria-controls="reg-library-articles" aria-pressed="true">업무별 조문</button>
          <button type="button" class="lens-btn" data-reg-mode="comparison" aria-controls="reg-library-comparison" aria-pressed="false">발행어음·IMA 비교</button>
        </div>
        <div id="reg-library-articles" class="reg-library-view">
          <div class="reg-library-filters">
            <label>규정 검색<input type="search" id="reg-library-query" placeholder="예: 모험자본, 제77조의6"></label>
            <label>업무<select id="reg-library-area"><option value="">전체 업무</option></select></label>
            <label>법령<select id="reg-library-source"><option value="">전체 법령</option></select></label>
          </div>
          <div class="chips reg-library-shortcuts" role="group" aria-label="주요 업무">
            <button type="button" class="chip" data-reg-area="note" aria-pressed="false">발행어음</button>
            <button type="button" class="chip" data-reg-area="ima" aria-pressed="false">IMA</button>
            <button type="button" class="chip" data-reg-area="venture" aria-pressed="false">기업금융·모험자본</button>
          </div>
          <p id="reg-library-count" class="reg-library-count" role="status"></p>
          <div id="reg-library-results"></div>
          <button id="reg-library-more" class="btn" type="button" hidden>조문 더 보기</button>
        </div>
        <div id="reg-library-comparison" class="reg-library-view" hidden>
          <label class="reg-library-topic">비교 항목<select id="reg-library-topic"></select></label>
          <div id="reg-library-comparison-results" aria-live="polite"></div>
          <p class="reg-library-related"><a href="#pnl">보고 주기·시정기한은 발행어음·IMA 규제 표에서 보기 →</a></p>
        </div>
      </div>
    </section>
    <details id="reg-library-sources" class="panel reg-library-sources" hidden>
      <summary>수록 자료와 범위</summary>
      <p>부칙·별표·서식은 공식 원문에서, 개별 인가 조건은 각 인가 문서에서 확인하세요.</p>
      <ul id="reg-library-source-list"></ul>
    </details>
  </div>`;
}

function prepareLibrary(data) {
  const areas = data.areas.map(area => ({ ...area, matches: new RegExp(area.pattern) }));
  const sources = new Map(data.sources.map(source => [source.id, source]));
  const featured = new Map(data.featured.map(([source, number], index) => [`${source}:${number}`, index]));
  const byNumber = new Map();
  const articles = data.articles.map(entry => {
    const source = sources.get(entry.source);
    const key = `${source.id}:${entry.number}`;
    const matchingAreas = areas.filter(area => area.matches.test(`${entry.title}\n${entry.text}`));
    const title = normalize(`${source.name} ${source.label} ${entry.number} ${entry.title}`);
    const body = normalize(entry.text);
    const article = {
      ...entry, source, areas: matchingAreas.map(area => area.id), titleKey: title,
      searchable: title + body + normalize(matchingAreas.map(area => area.label).join(' ')) +
        (title.includes('순자본비율') || body.includes('순자본비율') ? 'ncr' : ''),
      priority: featured.get(key) ?? featured.size
    };
    if (!byNumber.has(key)) byNumber.set(key, []);
    byNumber.get(key).push(article);
    return article;
  }).sort((a, b) => a.priority - b.priority);
  return { ...data, areas, sources, articles, byNumber };
}

function loadLibrary() {
  libraryPromise ??= fetch('/regulations.json').then(response => {
    if (!response.ok) throw new Error('Regulation data unavailable');
    return response.json();
  }).then(prepareLibrary).catch(error => {
    libraryPromise = null;
    throw error;
  });
  return libraryPromise;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function officialLink(source, number) {
  const link = makeElement('a', 'reg-library-link', '국가법령정보센터 ↗');
  link.href = number && source.articleLinks ? `${source.officialUrl}/${encodeURIComponent(number)}` : source.officialUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function articleCard(article, byNumber) {
  const card = makeElement('details', 'reg-library-article');
  const summary = makeElement('summary');
  summary.append(
    makeElement('span', 'reg-library-citation', `${article.source.label} · ${article.number}`),
    makeElement('strong', 'reg-library-article-title', article.title)
  );
  if (article.effectiveOn) {
    const time = makeElement('time', 'badge blue', `시행일 ${article.effectiveOn.replaceAll('-', '.')}`);
    time.dateTime = article.effectiveOn;
    summary.append(time);
  } else if (byNumber.get(`${article.source.id}:${article.number}`).length > 1) {
    summary.append(makeElement('span', 'badge', '병기된 문안'));
  } else if (!article.text) {
    summary.append(makeElement('span', 'badge', '제목 수록'));
  }
  const content = makeElement('div', 'reg-library-excerpt');
  content.append(
    makeElement('p', 'reg-library-text', article.text || '첨부 자료에는 조문 제목이 수록되어 있습니다.'),
    officialLink(article.source, article.number)
  );
  card.append(summary, content);
  return card;
}

function mountLibrary(root, library) {
  const { preparedOn, sources, areas, articles, comparison, byNumber } = library;
  const get = id => root.querySelector(`#reg-library-${id}`);
  const query = get('query'), area = get('area'), source = get('source'), topic = get('topic');
  const results = get('results'), count = get('count'), more = get('more');
  const shortcuts = root.querySelectorAll('[data-reg-area]');
  const formatNumber = new Intl.NumberFormat('ko-KR');
  let matching = [], shown = 0;

  get('date').textContent = `원본 정리 ${preparedOn.replaceAll('-', '.')}`;
  get('date').hidden = false;
  areas.forEach(item => area.add(new Option(item.label, item.id)));
  sources.forEach(item => {
    source.add(new Option(item.label, item.id));
    const line = makeElement('li');
    line.append(
      makeElement('strong', '', `${item.name} · ${item.count}건`),
      makeElement('span', 'muted', `${item.scope} · ${item.inputFile}`),
      officialLink(item)
    );
    get('source-list').append(line);
  });
  comparison.forEach((item, i) => topic.add(new Option(item.title, i)));

  function showNextPage(focusNext = false) {
    const batch = matching.slice(shown, shown + pageSize).map(article => articleCard(article, byNumber));
    results.append(...batch);
    shown += batch.length;
    more.hidden = shown >= matching.length;
    count.textContent = matching.length
      ? `조문 항목 ${formatNumber.format(matching.length)}건 · ${formatNumber.format(shown)}건 표시`
      : '일치하는 조문이 없습니다. 검색어나 적용한 필터를 바꿔 보세요.';
    if (focusNext) batch[0]?.querySelector('summary').focus();
  }

  function refreshArticles() {
    const words = query.value.trim().split(/\s+/).filter(Boolean).map(normalize);
    const citationRank = article => {
      const ref = normalize(article.number);
      if (words.includes(ref) || words.includes(ref.slice(1))) return 0;
      return words.every(word => article.titleKey.includes(word)) ? 1 : 2;
    };
    matching = articles.filter(article =>
      (!area.value || article.areas.includes(area.value)) &&
      (!source.value || article.source.id === source.value) &&
      words.every(word => article.searchable.includes(word))
    );
    if (words.length) matching.sort((a, b) => citationRank(a) - citationRank(b));
    shown = 0;
    results.replaceChildren();
    shortcuts.forEach(button => {
      const active = area.value === button.dataset.regArea;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    showNextPage();
  }

  function showComparison() {
    const selected = comparison[Number(topic.value)];
    const columns = makeElement('div', 'reg-library-comparison-cards');
    for (const [key, label] of [['note', '발행어음'], ['ima', 'IMA'], ['common', '공통 적용']]) {
      const entry = selected[key];
      if (!entry) continue;
      const book = sources.get(entry.source);
      const card = makeElement('article', `reg-library-compare-card is-${key}`);
      card.append(makeElement('h2', '', label));
      if (entry.summary) card.append(makeElement('strong', 'reg-library-summary', entry.summary));
      card.append(
        makeElement('p', 'reg-library-citation', `${book.label} ${entry.citation}`),
        makeElement('p', 'reg-library-text', entry.excerpt),
        officialLink(book, entry.number)
      );
      columns.append(card);
    }
    const view = get('comparison-results');
    view.replaceChildren(columns);
    for (const { source, number } of selected.related ?? []) {
      view.append(articleCard(byNumber.get(`${source}:${number}`)[0], byNumber));
    }
  }

  query.addEventListener('input', refreshArticles);
  area.addEventListener('change', refreshArticles);
  source.addEventListener('change', refreshArticles);
  shortcuts.forEach(button => button.addEventListener('click', () => {
    area.value = area.value === button.dataset.regArea ? '' : button.dataset.regArea;
    refreshArticles();
  }));
  more.addEventListener('click', () => showNextPage(true));
  topic.addEventListener('change', showComparison);
  const modes = root.querySelectorAll('[data-reg-mode]');
  const setMode = isComparison => {
    get('articles').hidden = isComparison;
    get('comparison').hidden = !isComparison;
    modes.forEach(mode => {
      const active = (mode.dataset.regMode === 'comparison') === isComparison;
      mode.classList.toggle('active', active);
      mode.setAttribute('aria-pressed', String(active));
    });
  };
  modes.forEach(button => button.addEventListener('click', () => {
    setMode(button.dataset.regMode === 'comparison');
  }));

  // Apply URL deep-link parameters (?q=..., ?area=..., ?source=..., ?mode=comparison&topic=0..11)
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const paramQ = params.get('q') || '';
  const paramArea = params.get('area') || '';
  const paramSource = params.get('source') || '';
  const paramMode = params.get('mode') || '';
  const paramTopic = params.get('topic');

  if (paramQ) query.value = paramQ;
  if (paramArea && [...area.options].some(o => o.value === paramArea)) area.value = paramArea;
  if (paramSource && [...source.options].some(o => o.value === paramSource)) source.value = paramSource;
  if (paramTopic !== null && [...topic.options].some(o => o.value === String(paramTopic))) topic.value = String(paramTopic);

  refreshArticles();
  showComparison();
  if (paramMode === 'comparison') {
    setMode(true);
  } else if (paramQ) {
    setMode(false);
    const firstCard = results.querySelector('details.reg-library-article');
    if (firstCard) firstCard.open = true;
  }

  get('content').hidden = false;
  get('sources').hidden = false;
}

export async function bindRegulationLibrary() {
  const root = document.getElementById('regulation-library');
  if (!root) return;
  const status = root.querySelector('#reg-library-loading');
  const retry = root.querySelector('#reg-library-retry');
  retry.hidden = true;
  status.textContent = '조문을 불러오는 중입니다.';
  try {
    const library = await loadLibrary();
    if (!root.isConnected) return;
    mountLibrary(root, library);
    status.hidden = true;
  } catch {
    status.textContent = '조문을 불러오지 못했습니다.';
    retry.hidden = false;
    retry.onclick = bindRegulationLibrary;
  }
}
