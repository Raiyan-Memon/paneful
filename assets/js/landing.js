/* Paneful landing — auto-scrolling showcase + theme gallery, drawn live with the same engine the editor uses. */
(function () {
  'use strict';
  const P = window.Paneful;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const $ = (id) => document.getElementById(id);
  $('yr').textContent = new Date().getFullYear();
  $('themeCount').textContent = String(P.THEME_COUNT.designs);

  // sizes: written from the real export settings so they never go out of date
  const sizes = Object.values(P.SIZES).map((x) => `${x.store === 'Google Play' ? 'Play ' : ''}${x.label}`).concat(['Play feature graphic']);
  $('sizeList').textContent = sizes.join(', ') + '.';
  $('faqSizes').textContent = Object.values(P.SIZES).concat([P.FEATURE]).map((x) => `${x.store} ${x.label} (${x.w}×${x.h})`).join(', ') + '. Each size gets its own folder in the ZIP.';
  $('statLooks').textContent = String(P.THEME_COUNT.looks);

  let getImage = () => null;
  function slideFor(theme, v, i) {
    const s = P.defaultSlide();
    Object.assign(s.text, P.DEMO_TEXT[i % 3]);
    s.shot = String(i % 3);
    P.applyTheme(s, theme, i, v);
    return s;
  }
  function draw(canvas, theme, v, i, cssW) {
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round((canvas.width * 2868) / 1320);
    P.render(canvas.getContext('2d'), canvas.width, canvas.height, slideFor(theme, v, i), { frame: 'iphone', getImage });
  }

  /* render queue so the page stays responsive */
  let queue = [];
  let busy = false;
  function enqueue(job) {
    queue.push(job);
    if (!busy) { busy = true; setTimeout(drain, 0); }
  }
  function drain() {
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 30) {
      try { queue.shift()(); } catch (e) { console.error(e); }
    }
    if (queue.length) setTimeout(drain, 16); else busy = false;
  }

  /* ── hero: a fan of three slides that cross-fades through themes ── */
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function buildFan() {
    const T = P.THEMES;
    const trios = [0, 9, 14, 26, 37, 49, 5, 31].map((idx, k) => [T[idx % T.length], k % 3]);
    const slots = [...document.querySelectorAll('#fan .fan-slot')];
    const order = [1, 0, 2]; // left, centre, right → slide 2, 1, 3
    const label = $('fanLabel');
    const cache = [];
    let k = 0, front = 0, paused = false;
    const W = window.innerWidth < 900 ? 160 : 220;
    function render(n) {
      if (cache[n]) return cache[n];
      const [th, v] = trios[n];
      cache[n] = order.map((i) => {
        const c = document.createElement('canvas');
        draw(c, th, v, i, W * 1.25);
        return c.toDataURL('image/jpeg', 0.9);
      });
      return cache[n];
    }
    function show(n) {
      const urls = render(n);
      front = 1 - front;
      slots.forEach((slot, j) => {
        const imgs = slot.querySelectorAll('img');
        imgs[front].src = urls[j];
        imgs[front].classList.add('on');
        imgs[1 - front].classList.remove('on');
      });
      const [th] = trios[n];
      label.innerHTML = `<b>${th.name}</b> · ${th.categoryName}`;
    }
    show(0);
    window.PANEFUL_FAN = () => k;
    if (reduce) return;
    const fan = $('fan');
    fan.addEventListener('mouseenter', () => { paused = true; });
    fan.addEventListener('mouseleave', () => { paused = false; });
    // render the next set ahead of time so the swap is instant
    setTimeout(() => render(1), 400);
    setInterval(() => {
      if (paused || document.hidden) return;
      k = (k + 1) % trios.length;
      show(k);
      const next = (k + 1) % trios.length;
      setTimeout(() => render(next), 300);
    }, 3200);
  }

  /* ── feature icons ── */
  const FI = {
    themes: '<rect x="3.5" y="3.5" width="7" height="9" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/>',
    device: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 5.5h3"/>',
    badge: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7.5 12h.01M11 12h5.5"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z"/><path d="M9.2 14.6a3 3 0 0 0 2.6 2.6"/>',
    store: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9h17M7 13h4M7 16h7"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    shield: '<path d="M12 3.2 4.5 6v5.6c0 4.4 3.1 8.1 7.5 9.2 4.4-1.1 7.5-4.8 7.5-9.2V6L12 3.2Z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/>',
    zip: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M11 7h1M11 10h1M11 13h1M10.5 16h2v2h-2z"/>',
    png: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 4.5-4.5 3.5 3.5 3-3 5 5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    save: '<path d="M4 16.5 9 20l11-15"/>',
  };
  document.querySelectorAll('.fi').forEach((n) => {
    n.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FI[n.dataset.i] || ''}</svg>`;
  });

  /* ── theme gallery with categories + load more ── */
  const PAGE = 9;
  let cat = 'all';
  let shown = PAGE;
  function gcard(th) {
    const a = document.createElement('a');
    a.className = 'gcard';
    let v = 0;
    a.href = `app/?theme=${th.id}&v=0`;
    a.title = `Open the editor with ${th.name}`;
    const prev = document.createElement('div');
    prev.className = 'gprev';
    const canvases = [0, 1, 2].map(() => {
      const c = document.createElement('canvas');
      prev.append(c);
      return c;
    });
    const paint = () => canvases.forEach((c, i) => enqueue(() => draw(c, th, v, i, 110)));
    const meta = document.createElement('div');
    meta.className = 'gmeta';
    meta.innerHTML = `<div><b></b><small></small></div>`;
    meta.querySelector('b').textContent = th.name;
    meta.querySelector('small').textContent = th.categoryName;
    const dots = document.createElement('div');
    dots.className = 'gdots';
    th.swatches.forEach((pl, k) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = k === 0 ? 'on' : '';
      d.title = `Colourway ${k + 1}`;
      d.setAttribute('aria-label', `${th.name} colourway ${k + 1}`);
      d.style.background = `linear-gradient(135deg, ${pl[0]} 0 50%, ${pl[2]} 50% 100%)`;
      d.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        v = k;
        a.href = `app/?theme=${th.id}&v=${k}`;
        dots.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
        paint();
      };
      dots.append(d);
    });
    meta.append(dots);
    a.append(prev, meta);
    paint();
    return a;
  }
  function list() { return P.THEMES.filter((t) => cat === 'all' || t.category === cat); }
  function renderGallery(append) {
    const grid = $('themeGrid');
    const L = list();
    const start = append ? grid.children.length : 0;
    if (!append) grid.innerHTML = '';
    L.slice(start, shown).forEach((th) => grid.append(gcard(th)));
    const left = L.length - Math.min(shown, L.length);
    const more = $('themeMore');
    more.parentElement.hidden = left <= 0;
    more.textContent = `Load more themes · ${left} left`;
  }
  function buildCats() {
    const wrap = $('themeCats');
    [['all', 'All']].concat(P.CATEGORIES).forEach(([k, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.className = k === cat ? 'on' : '';
      b.onclick = () => {
        cat = k;
        shown = PAGE;
        wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        renderGallery(false);
      };
      wrap.append(b);
    });
    $('themeMore').onclick = () => { shown += PAGE; renderGallery(true); };
  }

  async function init() {
    await P.ensureFonts(P.FONTS.map((f) => f.name));
    const shots = await P.demoCanvases();
    getImage = (id) => shots[+id] || null;
    buildFan();
    buildCats();
    renderGallery(false);
    const wait = () => (queue.length || busy ? setTimeout(wait, 50) : (window.PANEFUL_LANDING_READY = true));
    wait();
  }
  init().catch((e) => { console.error(e); window.PANEFUL_LANDING_READY = true; });
})();
