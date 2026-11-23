/* Paneful editor — slides, panels, direct manipulation, undo/redo, autosave, export. Runs entirely in the browser. */
(function () {
  'use strict';
  const P = window.Paneful;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = P.clone;
  const MAX_SLIDES = 10;
  const PLAY_MAX = 8;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD = isMac ? '⌘' : 'Ctrl';

  /* ───────── icons ───────── */
  const ICON = {
    themes: '<rect x="3.5" y="3.5" width="7" height="9" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/>',
    bg: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 4.5-4.5 3.5 3.5 3-3 5 5"/>',
    text: '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>',
    device: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 5.5h3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    more: '<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
    download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9.5 7V4.5h5V7"/>',
    toFront: '<rect x="8" y="8" width="11" height="11" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M5 15.5V6a1 1 0 0 1 1-1h9.5"/>',
    toBack: '<rect x="5" y="5" width="11" height="11" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M19 8.5V18a1 1 0 0 1-1 1H8.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 19.5h14"/>',
    grip: '<circle cx="9" cy="7" r="1.1" fill="currentColor"/><circle cx="15" cy="7" r="1.1" fill="currentColor"/><circle cx="9" cy="12" r="1.1" fill="currentColor"/><circle cx="15" cy="12" r="1.1" fill="currentColor"/><circle cx="9" cy="17" r="1.1" fill="currentColor"/><circle cx="15" cy="17" r="1.1" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    alignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    alignR: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    check: '<path d="M12 3.2 4.5 6v5.6c0 4.4 3.1 8.1 7.5 9.2 4.4-1.1 7.5-4.8 7.5-9.2V6L12 3.2Z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z"/><path d="M9.2 14.6a3 3 0 0 0 2.6 2.6"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.2M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    elements: '<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z"/><path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 4.5-4.5 3.5 3.5 3-3 5 5"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  /* ───────── storage (IndexedDB, falls back to memory) ───────── */
  const DB = {
    db: null,
    mem: { kv: {}, assets: {} },
    open() {
      if (this._p) return this._p;
      this._p = new Promise((res) => {
        try {
          const r = indexedDB.open('paneful', 1);
          r.onupgradeneeded = () => {
            r.result.createObjectStore('kv');
            r.result.createObjectStore('assets');
          };
          r.onsuccess = () => res((this.db = r.result));
          r.onerror = () => res((this.db = false));
          r.onblocked = () => res((this.db = false));
        } catch (e) {
          res((this.db = false));
        }
      });
      return this._p;
    },
    async get(store, key) {
      const db = await this.open();
      if (!db) return this.mem[store][key];
      return new Promise((res) => {
        try {
          const q = db.transaction(store).objectStore(store).get(key);
          q.onsuccess = () => res(q.result);
          q.onerror = () => res(undefined);
        } catch (e) { res(undefined); }
      });
    },
    async set(store, key, val) {
      const db = await this.open();
      if (!db) { this.mem[store][key] = val; return; }
      return new Promise((res, rej) => {
        try {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).put(val, key);
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error);
        } catch (e) { rej(e); }
      });
    },
    async del(store, key) {
      const db = await this.open();
      if (!db) { delete this.mem[store][key]; return; }
      return new Promise((res) => {
        try {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).delete(key);
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    },
    async keys(store) {
      const db = await this.open();
      if (!db) return Object.keys(this.mem[store]);
      return new Promise((res) => {
        try {
          const q = db.transaction(store).objectStore(store).getAllKeys();
          q.onsuccess = () => res(q.result || []);
          q.onerror = () => res([]);
        } catch (e) { res([]); }
      });
    },
  };

  /* ───────── images ───────── */
  const assets = new Map(); // id -> { blob, img }
  const getImage = (id) => {
    const a = id && assets.get(id);
    return a ? a.img : null;
  };
  function decodeBlob(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }
  async function addAsset(blob) {
    const img = await decodeBlob(blob);
    const id = 'a_' + P.uid();
    assets.set(id, { blob, img });
    try { await DB.set('assets', id, blob); } catch (e) { console.warn('Could not store image', e); }
    return id;
  }
  async function loadAsset(id) {
    if (!id || assets.has(id)) return;
    const blob = await DB.get('assets', id);
    if (!blob) return;
    try { assets.set(id, { blob, img: await decodeBlob(blob) }); } catch (e) { /* skip broken image */ }
  }
  const usedAssetIds = (d) => {
    const ids = new Set();
    d.slides.forEach((s) => {
      if (s.shot) ids.add(s.shot);
      if (s.bg && s.bg.image) ids.add(s.bg.image);
      (s.badges || []).forEach((b) => { if (b && b.asset) ids.add(b.asset); });
    });
    if (d.meta && d.meta.icon) ids.add(d.meta.icon);
    return ids;
  };
  async function gcAssets() {
    const used = usedAssetIds(doc);
    if (doc.meta && doc.meta.icon) used.add(doc.meta.icon);
    for (const k of await DB.keys('assets')) if (!used.has(k)) await DB.del('assets', k);
  }

  /* ───────── document + history ───────── */
  let doc = null;
  let sel = 0;
  let tab = 'themes';
  let selBadge = null;
  const hist = { undo: [], redo: [], last: null };
  const snapshot = () => JSON.stringify({ slides: doc.slides, theme: doc.theme || null, variant: doc.variant | 0, custom: doc.custom || null });
  const cur = () => doc.slides[sel];

  function normalizeSlide(s) {
    const d = P.defaultSlide();
    const out = Object.assign(d, s);
    out.bg = Object.assign(P.defaultSlide().bg, s.bg || {});
    out.text = Object.assign(P.defaultSlide().text, s.text || {});
    out.device = Object.assign(P.defaultSlide().device, s.device || {});
    out.ui = Object.assign(P.defaultUI(), s.ui || {});
    out.badges = Array.isArray(s.badges) ? s.badges.filter((b) => b && P.BADGE_KINDS[b.kind]).map((b) => Object.assign({ id: 'b' + P.uid(), x: 0.5, y: 0.5, size: 40, rot: 0 }, b)) : [];
    if (!Array.isArray(out.bg.glows)) out.bg.glows = [];
    if (!out.id) out.id = P.uid();
    return out;
  }
  function defaultMeta() {
    return { name: 'Bloom', subtitle: 'Habit tracker & daily goals', developer: 'Bloom Labs', rating: '4.8', ratings: '12K', category: 'Health & Fitness', icon: null };
  }
  function normalizeDoc(d) {
    if (!d || !Array.isArray(d.slides) || !d.slides.length) return null;
    const seen = new Set();
    const slides = d.slides.slice(0, MAX_SLIDES).map(normalizeSlide);
    slides.forEach((s) => { if (seen.has(s.id)) s.id = P.uid(); seen.add(s.id); });
    return { v: 1, theme: d.theme || null, variant: d.variant | 0, custom: Array.isArray(d.custom) ? d.custom : null, meta: Object.assign(defaultMeta(), d.meta || {}), size: P.SIZES[d.size] ? d.size : 'ios69', slides };
  }

  function commit() {
    const now = snapshot();
    if (now === hist.last) return;
    if (hist.last != null) hist.undo.push(hist.last);
    if (hist.undo.length > 120) hist.undo.shift();
    hist.redo.length = 0;
    hist.last = now;
    syncUndo();
    save();
  }
  function restore(json) {
    const o = JSON.parse(json);
    doc.slides = o.slides;
    doc.theme = o.theme;
    doc.variant = o.variant | 0;
    doc.custom = o.custom || null;
    sel = clamp(sel, 0, doc.slides.length - 1);
    buildStrip();
    buildPanel();
    syncUndo();
    save();
  }
  function undo() {
    flushText();
    if (!hist.undo.length) return;
    hist.redo.push(hist.last);
    hist.last = hist.undo.pop();
    restore(hist.last);
  }
  function redo() {
    if (!hist.redo.length) return;
    hist.undo.push(hist.last);
    hist.last = hist.redo.pop();
    restore(hist.last);
  }
  function resetHistory() {
    hist.undo.length = 0;
    hist.redo.length = 0;
    hist.last = snapshot();
    syncUndo();
  }
  function syncUndo() {
    $('undo').disabled = !hist.undo.length;
    $('redo').disabled = !hist.redo.length;
  }

  let saveTimer = 0;
  function save() {
    if (P.extras) P.extras.scheduleCheck();
    $('saveState').textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await DB.set('kv', 'project', JSON.parse(JSON.stringify(doc)));
        $('saveState').textContent = DB.db ? 'Saved' : 'Not saved';
        $('saveState').title = DB.db ? 'Saved in this browser' : 'This browser blocks storage, so work is lost on refresh. Use “Save project file”.';
      } catch (e) {
        $('saveState').textContent = 'Not saved';
        console.warn(e);
      }
    }, 450);
  }

  /* text inputs commit after a pause, so undo steps are word-sized rather than letter-sized */
  let textTimer = 0;
  function textChanged() {
    clearTimeout(textTimer);
    textTimer = setTimeout(commit, 700);
  }
  function flushText() {
    if (textTimer) { clearTimeout(textTimer); textTimer = 0; commit(); }
  }

  /* ───────── rendering ───────── */
  const cards = new Map(); // slide id -> { card, canvas, boxes }
  const dirty = new Set();
  let raf = 0;
  function requestRender(id) {
    if (id == null) doc.slides.forEach((s) => dirty.add(s.id));
    else dirty.add(id);
    if (!raf) raf = requestAnimationFrame(flush);
  }
  function flush() {
    raf = 0;
    const size = P.SIZES[doc.size];
    for (const id of dirty) {
      const c = cards.get(id);
      const s = doc.slides.find((x) => x.id === id);
      if (!c || !s) continue;
      const ctx = c.canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        c.boxes = P.render(ctx, c.canvas.width, c.canvas.height, s, { frame: size.frame, getImage });
      } catch (e) {
        console.error('Render failed', e);
      }
    }
    dirty.clear();
    updateOverlays();
  }

  /* ───────── slide strip ───────── */
  const strip = $('strip');
  function cardSize() {
    const st = $('stage');
    const size = P.SIZES[doc.size];
    const avail = st.clientHeight - 140;
    const h = clamp(avail, 280, 860);
    return { w: Math.round((h * size.w) / size.h), h: Math.round(h) };
  }

  function buildStrip() {
    const scroll = strip.scrollLeft;
    strip.innerHTML = '';
    cards.clear();
    const { w, h } = cardSize();
    doc.slides.forEach((s, i) => {
      const card = el('div', 'card' + (i === sel ? ' sel' : ''));
      card.dataset.id = s.id;
      const head = el('div', 'chead');
      const grip = el('span', 'grip', `${ic('grip')}<span>${String(i + 1).padStart(2, '0')}</span>`);
      grip.title = 'Drag to reorder';
      head.append(grip);
      const canvas = document.createElement('canvas');
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      canvas.setAttribute('aria-label', `Slide ${i + 1}`);
      const acts = el('div', 'acts');
      const mk = (icon, title, fn, disabled) => {
        const b = el('button', 'icon-btn', ic(icon));
        b.title = title;
        b.setAttribute('aria-label', title);
        b.disabled = !!disabled;
        b.onclick = (e) => { e.stopPropagation(); fn(); };
        acts.append(b);
      };
      mk('left', 'Move left', () => moveSlide(i, i - 1), i === 0);
      mk('right', 'Move right', () => moveSlide(i, i + 1), i === doc.slides.length - 1);
      mk('copy', 'Duplicate', () => duplicateSlide(i), doc.slides.length >= MAX_SLIDES);
      mk('image', 'Change screenshot', () => pickFiles({ type: 'slide', id: s.id }, false));
      mk('trash', 'Delete', () => deleteSlide(i), doc.slides.length <= 1);
      const wrap = el('div', 'cwrap');
      const hover = el('div', 'hoverbox');
      const selbox = buildSelbox(s.id);
      wrap.append(canvas, hover, selbox);
      card.append(head, wrap, acts);
      strip.append(card);
      cards.set(s.id, { card, canvas, boxes: null, wrap, hover, selbox });
      wireCard(card, canvas, grip, s.id);
    });
    if (doc.slides.length < MAX_SLIDES) {
      const add = el('div', 'add', `${ic('plus')}<b>Add screenshots</b><small>or drop images here</small>`);
      add.style.width = Math.round(w * 0.82) + 'px';
      add.style.height = Math.round(h * 0.82) + 'px';
      add.tabIndex = 0;
      add.setAttribute('role', 'button');
      const blank = el('button', 'link', 'Add a blank slide');
      blank.onclick = (e) => { e.stopPropagation(); addSlides([null]); };
      add.append(blank);
      add.onclick = () => pickFiles({ type: 'new' }, true);
      add.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles({ type: 'new' }, true); } };
      strip.append(add);
    }
    strip.scrollLeft = scroll;
    $('slideCount').textContent = `${doc.slides.length} of ${MAX_SLIDES} slides`;
    requestRender();
  }

  function selectSlide(i, opts) {
    i = clamp(i, 0, doc.slides.length - 1);
    const changed = i !== sel;
    sel = i;
    if (selObj && selObj.slide !== doc.slides[sel].id) setSel(null);
    cards.forEach((c, id) => c.card.classList.toggle('sel', id === doc.slides[sel].id));
    if (changed || (opts && opts.panel)) buildPanel();
    const c = cards.get(doc.slides[sel].id);
    if (c && opts && opts.scroll) c.card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }
  const indexOfId = (id) => doc.slides.findIndex((s) => s.id === id);

  function newSlideLike(base, index) {
    const s = normalizeSlide(clone(base || P.defaultSlide()));
    s.id = P.uid();
    s.shot = null;
    s.text.headline = 'Your *headline* here';
    s.text.sub = 'One short line about this screen';
    const th = doc.theme && P.themeById(doc.theme);
    if (th) P.applyTheme(s, th, index, doc.variant | 0, doc.variant === 3 ? doc.custom : null);
    return s;
  }
  /** Adds one slide per entry (asset id or null), after `after` (default: end). Returns how many were added. */
  function addSlides(shots, after) {
    const room = MAX_SLIDES - doc.slides.length;
    const list = shots.slice(0, room);
    if (!list.length) { toast(`You can have up to ${MAX_SLIDES} slides.`); return 0; }
    let at = after == null ? doc.slides.length : after + 1;
    const first = at;
    list.forEach((id) => {
      const base = doc.slides[Math.min(at - 1, doc.slides.length - 1)] || doc.slides[0];
      const s = newSlideLike(base, at);
      s.shot = id;
      doc.slides.splice(at, 0, s);
      at++;
    });
    if (shots.length > list.length) toast(`Added ${list.length}. The limit is ${MAX_SLIDES} slides.`);
    sel = first;
    commit();
    buildStrip();
    buildPanel();
    const c = cards.get(doc.slides[sel].id);
    if (c) c.card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    return list.length;
  }
  function duplicateSlide(i) {
    if (doc.slides.length >= MAX_SLIDES) return toast(`You can have up to ${MAX_SLIDES} slides.`);
    const s = clone(doc.slides[i]);
    s.id = P.uid();
    doc.slides.splice(i + 1, 0, s);
    sel = i + 1;
    commit();
    buildStrip();
    buildPanel();
  }
  function deleteSlide(i) {
    if (doc.slides.length <= 1) return toast('A project needs at least one slide.');
    doc.slides.splice(i, 1);
    sel = clamp(sel > i ? sel - 1 : sel, 0, doc.slides.length - 1);
    commit();
    buildStrip();
    buildPanel();
    toast('Slide deleted', 'Undo', undo);
  }
  function moveSlide(from, to) {
    if (to < 0 || to >= doc.slides.length || from === to) return;
    const [s] = doc.slides.splice(from, 1);
    doc.slides.splice(to, 0, s);
    sel = to;
    commit();
    buildStrip();
    buildPanel();
  }

  /* direct manipulation + drag-and-drop on a card */
  let drag = null;
  let reorderFrom = null;
  const inBox = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  /** Hit test that respects the object's rotation. */
  function inRot(b, x, y, pad) {
    if (!b) return false;
    const a = -((b.rot || 0) * Math.PI) / 180;
    const cx = b.cx == null ? b.x + b.w / 2 : b.cx, cy = b.cy == null ? b.y + b.h / 2 : b.cy;
    const lx = (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a);
    const ly = (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a);
    return Math.abs(lx) <= b.w / 2 + pad && Math.abs(ly) <= b.h / 2 + pad;
  }
  function hitTest(id, canvas, e) {
    const c = cards.get(id);
    if (!c || !c.boxes) return null;
    const r = canvas.getBoundingClientRect();
    const k = canvas.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    const pad = 8 * DPR;
    const tb = c.boxes.text && { x: c.boxes.text.x - pad, y: c.boxes.text.y - pad, w: c.boxes.text.w + pad * 2, h: c.boxes.text.h + pad * 2 };
    const bs = c.boxes.badges || [];
    const hitBadge = (behind) => {
      for (let i = bs.length - 1; i >= 0; i--) if (!!bs[i].behind === behind && inRot(bs[i], x, y, 4 * DPR)) return { hit: 'badge', badge: bs[i].id, k, c, box: bs[i] };
      return null;
    };
    // top to bottom: elements in front, text, phone, elements behind the phone
    const front = hitBadge(false);
    if (front) return front;
    if (inBox(tb, x, y)) return { hit: 'text', k, c, box: c.boxes.text };
    if (inRot(c.boxes.device, x, y, 0)) return { hit: 'device', k, c, box: c.boxes.device };
    const back = hitBadge(true);
    if (back) return back;
    return { hit: null, k, c };
  }

  /* ───────── selection: outline + resize / rotate handles (an overlay; never exported) ───────── */
  let selObj = null; // { slide: slideId, kind: 'badge' | 'device' | 'text', id?: badgeId }
  let handleDrag = null;
  const KIND_LABEL = { device: 'Phone', text: 'Text' };
  function setSel(obj) {
    selObj = obj;
    selBadge = obj && obj.kind === 'badge' ? obj.id : null;
    if (tab === 'elements') panel.querySelectorAll('.el').forEach((x) => x.classList.toggle('on', x.dataset.id === selBadge));
    updateOverlays();
  }
  function boxFor(c, obj) {
    if (!c || !c.boxes || !obj) return null;
    if (obj.kind === 'badge') return (c.boxes.badges || []).find((b) => b.id === obj.id) || null;
    return c.boxes[obj.kind] || null;
  }
  function placeBox(node, c, b, pad) {
    const k = c.canvas.width / (c.canvas.clientWidth || 1);
    const w = b.w / k + pad * 2, h = b.h / k + pad * 2;
    node.style.left = b.cx / k - w / 2 + 'px';
    node.style.top = b.cy / k - h / 2 + 'px';
    node.style.width = w + 'px';
    node.style.height = h + 'px';
    node.style.transform = b.rot ? `rotate(${b.rot}deg)` : '';
  }
  function updateOverlays() {
    cards.forEach((c, id) => {
      const on = selObj && selObj.slide === id;
      const b = on ? boxFor(c, selObj) : null;
      if (on && c.boxes && !b) { selObj = null; selBadge = null; }
      c.selbox.classList.toggle('on', !!b);
      if (!b) return;
      c.selbox.dataset.kind = selObj.kind;
      const s = doc.slides.find((x) => x.id === id);
      const bd = selObj.kind === 'badge' && s ? (s.badges || []).find((x) => x.id === selObj.id) : null;
      c.selbox.querySelector('.lab').textContent = bd ? P.BADGE_KINDS[bd.kind].label : KIND_LABEL[selObj.kind];
      placeBox(c.selbox, c, b, 5);
    });
  }
  function buildSelbox(slideId) {
    const box = el('div', 'selbox');
    box.append(el('span', 'lab'), el('span', 'tag'), el('i', 'rline'));
    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const h = el('b', 'h ' + pos);
      h.dataset.mode = 'scale';
      h.title = 'Drag to resize';
      box.append(h);
    });
    const r = el('b', 'h rot');
    r.dataset.mode = 'rotate';
    r.title = 'Drag to rotate (hold Shift to snap)';
    box.append(r);
    box.addEventListener('pointerdown', (e) => {
      const hnd = e.target.closest('.h');
      if (!hnd || !selObj || selObj.slide !== slideId) return;
      e.preventDefault();
      e.stopPropagation();
      const c = cards.get(slideId);
      const b = boxFor(c, selObj);
      const s = doc.slides.find((x) => x.id === slideId);
      if (!b || !s) return;
      hnd.setPointerCapture(e.pointerId);
      const r2 = c.canvas.getBoundingClientRect();
      const k = c.canvas.width / r2.width;
      const cx = r2.left + b.cx / k, cy = r2.top + b.cy / k;
      const bd = selObj.kind === 'badge' ? (s.badges || []).find((x) => x.id === selObj.id) : null;
      const target = bd || (selObj.kind === 'device' ? s.device : s.text);
      handleDrag = {
        mode: hnd.dataset.mode, slideId, kind: selObj.kind, target, cx, cy, moved: false,
        d0: Math.max(4, Math.hypot(e.clientX - cx, e.clientY - cy)),
        a0: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
        start: { size: target.size, subSize: target.subSize, scale: target.scale, rot: target.rot || 0 },
      };
      box.classList.add(handleDrag.mode === 'rotate' ? 'rotating' : 'scaling');
    });
    box.addEventListener('pointermove', (e) => {
      const d = handleDrag;
      if (!d || d.slideId !== slideId) return;
      d.moved = true;
      const tg = d.target;
      if (d.mode === 'scale') {
        const f = Math.max(0.05, Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0);
        if (d.kind === 'badge') tg.size = Math.round(clamp(d.start.size * f, 12, 160));
        else if (d.kind === 'device') tg.scale = +clamp(d.start.scale * f, 0.2, 1.8).toFixed(3);
        else { tg.size = Math.round(clamp(d.start.size * f, 24, 240)); tg.subSize = Math.round(clamp(d.start.subSize * f, 12, 120)); }
        box.querySelector('.tag').textContent = d.kind === 'device' ? Math.round(tg.scale * 100) + '%' : String(tg.size);
      } else {
        const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
        let rot = d.start.rot + (a - d.a0);
        rot = ((((rot + 180) % 360) + 360) % 360) - 180;
        if (e.shiftKey) rot = Math.round(rot / 15) * 15;
        else { const near = Math.round(rot / 45) * 45; if (Math.abs(rot - near) < 3) rot = near; }
        tg.rot = Math.round(rot * 10) / 10;
        box.querySelector('.tag').textContent = Math.round(tg.rot) + '°';
      }
      requestRender(slideId);
    });
    const end = () => {
      const d = handleDrag;
      if (!d || d.slideId !== slideId) return;
      handleDrag = null;
      box.classList.remove('rotating', 'scaling');
      if (d.moved) { commit(); buildPanel(); }
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    return box;
  }
  function showHover(c, b) {
    if (!b) { c.hover.classList.remove('on'); return; }
    placeBox(c.hover, c, b, 3);
    c.hover.classList.add('on');
  }
  /** Nudge / delete the selected object from the keyboard. Returns true if handled. */
  /** Moves an element to the top ('front') or bottom ('back') of its slide's stacking order. */
  function restack(s, id, where) {
    const i = (s.badges || []).findIndex((x) => x.id === id);
    if (i < 0) return;
    const [b] = s.badges.splice(i, 1);
    // back = behind everything, including the phone and its screenshot; front = above everything
    const hasPhone = s.device.type !== 'hidden';
    if (where === 'front') { b.behind = false; s.badges.push(b); }
    else { b.behind = hasPhone; s.badges.unshift(b); }
    selObj = { slide: s.id, kind: 'badge', id };
    selBadge = id;
    commit();
    requestRender(s.id);
    if (tab === 'elements') buildPanel();
    toast(where === 'front' ? 'Brought to front' : hasPhone ? 'Sent behind the phone' : 'Sent to back');
  }

  function keySelected(e) {
    if (!selObj) return false;
    const s = doc.slides.find((x) => x.id === selObj.slide);
    if (!s) { setSel(null); return false; }
    const bd = selObj.kind === 'badge' ? (s.badges || []).find((x) => x.id === selObj.id) : null;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (bd) {
        s.badges = s.badges.filter((x) => x !== bd);
        setSel(null);
        commit();
        requestRender(s.id);
        buildPanel();
        toast('Element deleted', 'Undo', undo);
      }
      return true; // never delete the whole slide while something on it is selected
    }
    if (e.key.startsWith('Arrow')) {
      const step = e.shiftKey ? 0.02 : 0.004;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      const tg = bd || (selObj.kind === 'device' ? s.device : null);
      if (tg) { tg.x = +(tg.x + dx).toFixed(4); tg.y = +(tg.y + dy).toFixed(4); }
      else if (selObj.kind === 'text') { s.text.y = +(s.text.y + dy).toFixed(4); s.layout = 'custom'; }
      requestRender(s.id);
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => { commit(); buildPanel(); }, 350);
      return true;
    }
    return false;
  }
  let nudgeTimer = 0;

  function wireCard(card, canvas, grip, id) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const i = indexOfId(id);
      if (i < 0) return;
      if (i !== sel) selectSlide(i);
      const h = hitTest(id, canvas, e);
      if (!h || !h.hit) { setSel(null); return; }
      setSel({ slide: id, kind: h.hit, id: h.badge });
      if (cards.get(id)) cards.get(id).hover.classList.remove('on');
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const s = doc.slides[i];
      const bd = h.hit === 'badge' ? (s.badges || []).find((b) => b.id === h.badge) : null;
      if (h.hit === 'badge' && !bd) return;
      drag = { id, hit: h.hit, badge: h.badge, k: h.k, boxes: h.c.boxes, sx: e.clientX, sy: e.clientY, moved: false,
        start: h.hit === 'text' ? { y: s.text.y } : bd ? { x: bd.x, y: bd.y } : { x: s.device.x, y: s.device.y } };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drag && drag.id === id) {
        const dxp = (e.clientX - drag.sx) * drag.k, dyp = (e.clientY - drag.sy) * drag.k;
        if (!drag.moved && Math.hypot(dxp, dyp) < 3 * DPR) return;
        drag.moved = true;
        const s = doc.slides[indexOfId(id)];
        if (!s) return;
        const ref = drag.boxes.ref, sc = drag.boxes.scale;
        const dx = dxp / sc / ref.w, dy = dyp / sc / ref.h;
        if (drag.hit === 'text') {
          s.text.y = clamp(drag.start.y + dy, -0.05, 0.97);
        } else if (drag.hit === 'badge') {
          const bd = (s.badges || []).find((b) => b.id === drag.badge);
          if (bd) { bd.x = clamp(drag.start.x + dx, -0.1, 1.1); bd.y = clamp(drag.start.y + dy, -0.05, 1.05); }
        } else {
          let nx = clamp(drag.start.x + dx, -0.3, 1.3);
          if (Math.abs(nx - 0.5) < 0.012) nx = 0.5; // snap to centre
          s.device.x = nx;
          s.device.y = clamp(drag.start.y + dy, -0.6, 1.0);
        }
        requestRender(id);
        return;
      }
      const h = hitTest(id, canvas, e);
      canvas.style.cursor = h && h.hit ? 'move' : 'default';
      const c = cards.get(id);
      if (!c) return;
      const isSel = h && h.hit && selObj && selObj.slide === id && selObj.kind === h.hit && (h.hit !== 'badge' || selObj.id === h.badge);
      showHover(c, h && h.hit && !isSel ? h.box : null);
    });
    canvas.addEventListener('pointerleave', () => { const c = cards.get(id); if (c) c.hover.classList.remove('on'); });
    const end = () => {
      if (!drag || drag.id !== id) return;
      const d = drag;
      drag = null;
      if (d.hit === 'badge') selBadge = d.badge;
      if (d.moved) {
        commit();
        if (d.hit === 'badge' && tab !== 'elements') showTab('elements'); else buildPanel();
      } else {
        showTab(d.hit === 'text' ? 'text' : d.hit === 'badge' ? 'elements' : 'device');
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', (e) => {
      const h = hitTest(id, canvas, e);
      if (h && h.hit === 'text') { showTab('text'); const t = $('f-headline'); if (t) { t.focus(); t.select(); } return; }
      if (h && h.hit === 'badge') {
        const bd = ((doc.slides[indexOfId(id)] || {}).badges || []).find((x) => x.id === h.badge);
        if (bd && bd.kind === 'image') { pickFiles({ type: 'element', id, badge: bd.id }, false); return; }
        selBadge = h.badge; showTab('elements'); const t = document.querySelector('.el.on input'); if (t) { t.focus(); t.select(); } return; }
      pickFiles({ type: 'slide', id }, false);
    });

    // reorder via the grip (HTML5 drag) — files can also be dropped on a card
    grip.addEventListener('pointerdown', () => { card.draggable = true; });
    card.addEventListener('dragstart', (e) => {
      if (!card.draggable) return;
      reorderFrom = indexOfId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'paneful-slide');
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.draggable = false;
      reorderFrom = null;
      card.classList.remove('dragging');
      strip.querySelectorAll('.drop-before,.drop-after').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
    });
    card.addEventListener('dragover', (e) => {
      if (reorderFrom != null) {
        e.preventDefault();
        const r = card.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        strip.querySelectorAll('.drop-before,.drop-after').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
        card.classList.add(after ? 'drop-after' : 'drop-before');
      } else if (hasFiles(e)) {
        e.preventDefault();
        e.stopPropagation();
        $('stage').classList.remove('dropping');
        card.classList.add('file-over');
      }
    });
    card.addEventListener('dragleave', () => card.classList.remove('file-over'));
    card.addEventListener('drop', (e) => {
      card.classList.remove('file-over');
      if (reorderFrom != null) {
        e.preventDefault();
        const r = card.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        const from = reorderFrom;
        let to = indexOfId(id) + (after ? 1 : 0);
        if (from < to) to--;
        moveSlide(from, to);
        return;
      }
      if (hasFiles(e)) {
        e.preventDefault();
        e.stopPropagation();
        $('stage').classList.remove('dropping');
        handleFiles(e.dataTransfer.files, { type: 'slide', id });
      }
    });
  }
  const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');

  /* ───────── files ───────── */
  let pickTarget = null;
  function pickFiles(target, multiple) {
    pickTarget = target;
    const fi = $('fileInput');
    fi.multiple = !!multiple;
    fi.value = '';
    fi.click();
  }
  $('fileInput').addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length && pickTarget) handleFiles(files, pickTarget);
    pickTarget = null;
  });

  const isSvg = (f) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name || '');
  /** Turns an SVG into a large PNG so it renders and exports the same in every browser. */
  async function svgToPng(file) {
    let txt = await file.text();
    // SVGs with only a viewBox have no size in some browsers, so give them one
    const tag = (txt.match(/<svg\b[^>]*>/i) || [''])[0];
    let vw = 0, vh = 0;
    const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) { vw = +vb[1]; vh = +vb[2]; }
    const num = (a) => { const m = tag.match(new RegExp('\\s' + a + '\\s*=\\s*["\']\\s*([\\d.]+)(px)?\\s*["\']', 'i')); return m ? +m[1] : 0; };
    let w = num('width'), h = num('height');
    if (!w || !h) {
      if (!vw || !vh) { vw = vw || 512; vh = vh || 512; }
      w = vw; h = vh;
      const fixed = tag.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '').replace(/^<svg\b/i, `<svg width="${w}" height="${h}"`);
      txt = txt.replace(tag, fixed);
    }
    const img = await decodeBlob(new Blob([txt], { type: 'image/svg+xml' }));
    const k = 2048 / Math.max(w, h);
    const c = P.mkCanvas(w * k, h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('svg'))), 'image/png'));
  }

  async function filesToAssets(files) {
    const imgs = [...files].filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.name || ''));
    if (!imgs.length) { toast('Please choose an image (PNG, JPG, WebP or SVG).'); return []; }
    const ids = [];
    let bad = 0;
    for (const f of imgs) {
      try { ids.push(await addAsset(isSvg(f) ? await svgToPng(f) : f)); } catch (e) { bad++; }
    }
    if (bad) toast(bad === imgs.length ? 'That image couldn’t be opened. Try PNG, JPG, WebP or SVG.' : `${bad} image(s) couldn’t be opened.`);
    return ids;
  }

  async function handleFiles(files, target) {
    if (target.type === 'element') {
      // new image elements (logos, icons, stickers, SVGs), or replace one element's image
      const s = doc.slides[indexOfId(target.id)];
      if (!s) return;
      const ids = await filesToAssets(target.badge ? [...files].slice(0, 1) : [...files].slice(0, 8));
      if (!ids.length) return;
      if (!Array.isArray(s.badges)) s.badges = [];
      let last = null;
      const old = target.badge && s.badges.find((b) => b.id === target.badge);
      if (old) { old.asset = ids[0]; last = old; }
      else ids.forEach((asset) => { last = newBadge('image', s); last.asset = asset; s.badges.push(last); });
      selObj = { slide: s.id, kind: 'badge', id: last.id };
      selBadge = last.id;
      commit();
      requestRender(s.id);
      if (tab !== 'elements') showTab('elements'); else buildPanel();
      return;
    }
    if (target.type === 'bg') {
      const [id] = await filesToAssets([...files].slice(0, 1));
      const s = doc.slides[indexOfId(target.id)];
      if (!id || !s) return;
      s.bg.type = 'image';
      s.bg.image = id;
      commit();
      buildPanel();
      requestRender(s.id);
      return;
    }
    const ids = await filesToAssets(files);
    if (!ids.length) return;
    if (target.type === 'slide') {
      const i = indexOfId(target.id);
      if (i < 0) { addSlides(ids); return; }
      doc.slides[i].shot = ids[0];
      sel = i;
      if (ids.length > 1) {
        addSlides(ids.slice(1), i);
      } else {
        commit();
        selectSlide(i, { panel: true });
        requestRender(doc.slides[i].id);
      }
      return;
    }
    // new slides; if the project is just one untouched empty slide, fill it first
    const only = doc.slides.length === 1 && !doc.slides[0].shot;
    if (only) {
      doc.slides[0].shot = ids.shift();
      if (!ids.length) { commit(); buildStrip(); buildPanel(); return; }
    }
    addSlides(ids);
  }

  // dropping files anywhere on the stage adds new slides
  const stage = $('stage');
  stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('.cwrap')) setSel(null); });
  let dragDepth = 0;
  stage.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; stage.classList.add('dropping'); } });
  stage.addEventListener('dragleave', (e) => { if (hasFiles(e)) { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) stage.classList.remove('dropping'); } });
  stage.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  stage.addEventListener('drop', (e) => {
    dragDepth = 0;
    stage.classList.remove('dropping');
    if (hasFiles(e)) { e.preventDefault(); handleFiles(e.dataTransfer.files, { type: 'new' }); }
  });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });

  // paste an image → current slide's screenshot
  document.addEventListener('paste', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'))) return;
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    e.preventDefault();
    handleFiles(files.slice(0, 1), { type: 'slide', id: cur().id });
  });

  /* ───────── panel controls ───────── */
  const panel = $('panel');
  function updateRangeFill(r) {
    const p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--p', p + '%');
  }
  function field(label, control, out) {
    const f = el('div', 'field');
    const lab = el('div', 'lab');
    lab.append(el('span', '', label));
    if (out) lab.append(out);
    f.append(lab, control);
    return f;
  }
  /** Slider. `onSet` runs on every input (live); commit happens when the slider is released. */
  function slider(label, o) {
    const r = el('input');
    r.type = 'range';
    r.min = o.min; r.max = o.max; r.step = o.step || 1;
    r.value = o.get();
    r.id = o.id || '';
    r.setAttribute('aria-label', label);
    const out = el('output');
    const fmt = o.fmt || ((v) => String(v));
    out.textContent = fmt(+r.value);
    updateRangeFill(r);
    r.addEventListener('input', () => {
      o.set(+r.value);
      out.textContent = fmt(+r.value);
      updateRangeFill(r);
      requestRender(o.slideId || cur().id);
    });
    r.addEventListener('change', commit);
    r.addEventListener('dblclick', () => {
      if (o.reset == null) return;
      r.value = o.reset;
      r.dispatchEvent(new Event('input'));
      commit();
    });
    return field(label, r, out);
  }
  const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const normHex = (v) => {
    let h = v.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return '#' + h.toUpperCase();
  };
  function color(label, o) {
    const wrap = el('div', 'color');
    const sw = el('span', 'sw');
    const inp = el('input');
    inp.type = 'color';
    inp.value = normHex(o.get() || '#000000').toLowerCase();
    inp.setAttribute('aria-label', label);
    sw.style.background = o.get();
    sw.append(inp);
    const hex = el('input', 'hex');
    hex.value = normHex(o.get() || '#000000');
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', label + ' hex');
    inp.addEventListener('input', () => {
      const v = normHex(inp.value);
      o.set(v); hex.value = v; sw.style.background = v;
      requestRender(cur().id);
    });
    inp.addEventListener('change', commit);
    const fromHex = () => {
      if (!HEX.test(hex.value)) { hex.value = normHex(o.get()); return; }
      const v = normHex(hex.value);
      o.set(v); hex.value = v; inp.value = v.toLowerCase(); sw.style.background = v;
      requestRender(cur().id);
      commit();
    };
    hex.addEventListener('change', fromHex);
    hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fromHex(); hex.blur(); } });
    wrap.append(sw, hex);
    return field(label, wrap);
  }
  function seg(label, options, get, set, cls) {
    const s = el('div', 'seg' + (cls ? ' ' + cls : ''));
    s.setAttribute('role', 'radiogroup');
    s.setAttribute('aria-label', label || 'Options');
    options.forEach(([val, text, title]) => {
      const b = el('button', get() === val ? 'on' : '', text);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', get() === val ? 'true' : 'false');
      if (title) b.title = title;
      b.onclick = () => {
        set(val);
        commit();
        requestRender(cur().id);
        buildPanel();
      };
      s.append(b);
    });
    return label ? field(label, s) : s;
  }
  function select(label, options, get, set) {
    const s = el('select', 'inp');
    s.setAttribute('aria-label', label);
    options.forEach(([v, t]) => {
      const o = el('option', '', t);
      o.value = v;
      if (v === get()) o.selected = true;
      s.append(o);
    });
    s.addEventListener('change', async () => {
      set(s.value);
      commit();
      buildPanel();
      requestRender(cur().id);
    });
    return field(label, s);
  }
  function textarea(label, id, get, set, rows) {
    const t = el('textarea', 'inp');
    t.id = id;
    t.rows = rows || 2;
    t.value = get();
    t.spellcheck = true;
    t.setAttribute('aria-label', label);
    t.addEventListener('input', () => { set(t.value); requestRender(cur().id); textChanged(); });
    t.addEventListener('blur', flushText);
    return field(label, t);
  }
  function toggle(label, get, set) {
    const lab = el('label', 'switch');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = !!get();
    cb.onchange = () => { set(cb.checked); commit(); requestRender(cur().id); buildPanel(); };
    lab.append(el('span', '', label), cb, el('i'));
    return lab;
  }
  function textInput(label, get, set, id) {
    const t = el('input', 'inp');
    t.type = 'text';
    if (id) t.id = id;
    t.value = get() || '';
    t.setAttribute('aria-label', label);
    t.addEventListener('input', () => { set(t.value); requestRender(cur().id); textChanged(); });
    t.addEventListener('blur', flushText);
    return field(label, t);
  }
  const h3 = (t) => el('h3', '', t);
  const pct = (v) => Math.round(v * 100) + '%';
  const deg = (v) => Math.round(v) + '°';

  function applyAllButton(label, fn) {
    const b = el('button', 'btn btn-block apply-all', label);
    b.onclick = () => {
      const src = cur();
      doc.slides.forEach((s) => { if (s !== src) fn(src, s); });
      commit();
      requestRender();
      toast('Applied to all slides');
    };
    return b;
  }

  /* panels */
  const TABS = [['themes', 'Themes'], ['text', 'Text'], ['bg', 'Background'], ['device', 'Device'], ['elements', 'Elements']];
  function buildRail() {
    const rail = $('rail');
    rail.innerHTML = '';
    TABS.forEach(([k, label]) => {
      const b = el('button', k === tab ? 'on' : '', `${ic(k)}<span>${label}</span>`);
      b.title = label;
      b.onclick = () => showTab(k);
      b.dataset.tab = k;
      rail.append(b);
    });
  }
  function showTab(k) {
    flushText();
    tab = k;
    $('rail').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    buildPanel();
  }

  function buildPanel() {
    const st = panel.scrollTop;
    panel.innerHTML = '';
    const sameTab = panel.dataset.tab === tab;
    panel.dataset.tab = tab;
    if (tab !== 'themes' && themeObserver) { themeObserver.disconnect(); themeObserver = null; }
    ({ themes: panelThemes, bg: panelBg, text: panelText, device: panelDevice, elements: panelElements })[tab]();
    if (sameTab) panel.scrollTop = st;
  }

  /* themes browser: category filter, 3-slide previews, colourway dots, load more */
  let themeCat = 'all';
  let themeShown = 8;
  let themeObserver = null;
  const THEME_PAGE = 8;
  const themeVar = {};
  const previewCache = new Map();
  let previewQueue = [];
  let previewTimer = 0;
  function previewSig() {
    return doc.slides.slice(0, 3).map((s) => [s.shot, s.text.headline, s.text.sub].join('|')).join('§');
  }
  function queuePreview(canvas, theme, v, i, base) {
    previewQueue.push({ canvas, theme, v, i, base });
    if (!previewTimer) previewTimer = setTimeout(drainPreviews, 0);
  }
  function drainPreviews() {
    previewTimer = 0;
    const t0 = performance.now();
    while (previewQueue.length && performance.now() - t0 < 24) {
      const { canvas, theme, v, i, base } = previewQueue.shift();
      if (!canvas.isConnected) continue;
      const s = normalizeSlide(clone(base));
      P.applyTheme(s, theme, i, v, v === 3 ? doc.custom : null);
      try { P.render(canvas.getContext('2d'), canvas.width, canvas.height, s, { frame: 'iphone', getImage }); } catch (e) { console.error(e); }
      canvas.dataset.done = '1';
    }
    if (previewQueue.length) previewTimer = setTimeout(drainPreviews, 16);
  }
  function themeCard(th) {
    const active = doc.theme === th.id;
    const v = themeVar[th.id] != null ? themeVar[th.id] : active ? doc.variant | 0 : 0;
    const card = el('div', 'tcard' + (active ? ' on' : ''));
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Apply ${th.name} theme`);
    card.dataset.theme = th.id;
    const prev = el('div', 'tprev');
    const sig = previewSig();
    for (let i = 0; i < 3; i++) {
      const key = `${th.id}:${v}:${i}:${sig}:${v === 3 ? (doc.custom || []).join() : ''}`;
      let c = previewCache.get(key);
      if (!c) {
        c = document.createElement('canvas');
        c.width = Math.round(84 * DPR);
        c.height = Math.round((84 * 2868) / 1320 * DPR);
        previewCache.set(key, c);
        queuePreview(c, th, v, i, doc.slides[i % doc.slides.length]);
      }
      prev.append(c);
    }
    const meta = el('div', 'tmeta');
    const nm = el('div', 'tname');
    nm.append(el('b', '', th.name), el('small', '', th.categoryName));
    const dots = el('div', 'tdots');
    th.swatches.forEach((pl, k) => {
      const d = el('button', k === v ? 'on' : '');
      d.type = 'button';
      d.title = `Colourway ${k + 1}`;
      d.setAttribute('aria-label', `${th.name} colourway ${k + 1}`);
      d.style.background = `linear-gradient(135deg, ${pl[0]} 0 50%, ${pl[2]} 50% 100%)`;
      d.onclick = (e) => { e.stopPropagation(); themeVar[th.id] = k; applyThemeAll(th.id, k); };
      dots.append(d);
    });
    if (active && doc.variant === 3 && doc.custom) {
      const d = el('button', v === 3 ? 'on custom' : 'custom');
      d.type = 'button';
      d.title = 'Your app colours';
      d.setAttribute('aria-label', `${th.name} with your app colours`);
      d.style.background = `linear-gradient(135deg, ${doc.custom[0]} 0 50%, ${doc.custom[2]} 50% 100%)`;
      d.onclick = (e) => { e.stopPropagation(); themeVar[th.id] = 3; applyThemeAll(th.id, 3, doc.custom); };
      dots.append(d);
    }
    meta.append(nm, dots);
    card.append(prev, meta);
    const go = () => applyThemeAll(th.id, v);
    card.onclick = go;
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    return card;
  }
  function panelThemes() {
    if (previewCache.size > 600) previewCache.clear();
    previewQueue = [];
    const head = el('div', 'thead');
    head.append(el('h2', '', 'Themes'), el('span', 'tcount', `${P.THEME_COUNT.designs} sets · ${P.THEME_COUNT.looks} looks`));
    panel.append(head, el('p', 'hint', 'One click styles every slide. Your words and screenshots stay. Dots switch colourways.'));
    if (P.extras) panel.append(P.extras.colourCard());
    const cats = el('div', 'cats');
    [['all', 'All']].concat(P.CATEGORIES).forEach(([k, label]) => {
      const b = el('button', k === themeCat ? 'on' : '', label);
      b.type = 'button';
      b.onclick = () => { themeCat = k; themeShown = THEME_PAGE; buildPanel(); };
      cats.append(b);
    });
    panel.append(cats);
    const list = P.THEMES.filter((t) => themeCat === 'all' || t.category === themeCat);
    // keep the active theme visible
    const ai = list.findIndex((t) => t.id === doc.theme);
    if (themeCat === 'all' && ai >= themeShown) themeShown = Math.ceil((ai + 1) / THEME_PAGE) * THEME_PAGE;
    const grid = el('div', 'tlist');
    list.slice(0, themeShown).forEach((th) => grid.append(themeCard(th)));
    panel.append(grid);
    // infinite scroll: the next page loads by itself when you scroll near the bottom
    if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
    if (list.length > themeShown) {
      const sentinel = el('div', 'tsentinel', '<i></i><span>Loading more themes…</span>');
      sentinel.id = 'themeSentinel';
      panel.append(sentinel);
      const loadNext = () => {
        if (tab !== 'themes' || !sentinel.isConnected) return;
        const next = list.slice(themeShown, themeShown + THEME_PAGE);
        themeShown += next.length;
        next.forEach((th) => grid.append(themeCard(th)));
        if (themeShown >= list.length) {
          sentinel.remove();
          if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
          panel.append(el('p', 'tend', `That’s all ${list.length} ${list.length === 1 ? 'set' : 'sets'}.`));
        }
      };
      if ('IntersectionObserver' in window) {
        themeObserver = new IntersectionObserver((entries) => {
          if (entries.some((en) => en.isIntersecting)) loadNext();
        }, { root: panel, rootMargin: '0px 0px 500px 0px' });
        themeObserver.observe(sentinel);
      } else {
        // very old browsers: fall back to a button
        const more = el('button', 'btn btn-block more', 'Load more themes');
        more.onclick = () => { loadNext(); if (!sentinel.isConnected) more.remove(); };
        panel.append(more);
      }
    } else if (list.length > THEME_PAGE) {
      panel.append(el('p', 'tend', `That’s all ${list.length} sets.`));
    }
  }
  function applyThemeAll(id, variant, custom) {
    const th = P.themeById(id);
    if (!th) return;
    const useCustom = Array.isArray(custom) && custom.length === 3;
    variant = useCustom ? 3 : Math.max(0, Math.min(2, variant | 0));
    doc.slides.forEach((s, i) => P.applyTheme(s, th, i, variant, useCustom ? custom : null));
    doc.theme = id;
    doc.variant = variant;
    if (useCustom) doc.custom = custom.slice();
    themeVar[id] = variant;
    selBadge = null;
    commit();
    requestRender();
    if (tab === 'themes') {
      // update selection in place so the list doesn't jump
      panel.querySelectorAll('.tcard').forEach((c) => c.classList.toggle('on', c.dataset.theme === id));
      const card = panel.querySelector(`.tcard[data-theme="${id}"]`);
      if (card) card.replaceWith(themeCard(th));
    }
    toast(`${th.name} applied`);
  }

  function panelBg() {
    const s = cur();
    const b = s.bg;
    panel.append(el('h2', '', 'Background'), el('p', 'hint', `Slide ${sel + 1}. Use “Apply to all slides” to match the others.`));
    panel.append(h3('Style'));
    panel.append(seg(null, [['solid', 'Solid'], ['linear', 'Gradient'], ['radial', 'Glow'], ['split', 'Split'], ['image', 'Image']], () => b.type, (v) => {
      if (v !== 'solid' && v !== 'image' && (!b.c1 || !b.c2)) { b.c1 = b.color; b.c2 = b.color; }
      b.type = v;
      if (v === 'image' && !b.image) setTimeout(() => pickFiles({ type: 'bg', id: s.id }, false), 0);
    }, 'wrap'));
    panel.append(el('div', 'sec'));
    if (b.type === 'solid') {
      panel.append(color('Colour', { get: () => b.color, set: (v) => { b.color = v; } }));
    } else if (b.type === 'image') {
      const box = el('div', 'shot');
      const th = el('div', 'thumb', b.image ? '' : ic('image'));
      const img = getImage(b.image);
      if (img) th.style.backgroundImage = `url("${img.src}")`;
      const meta = el('div', 'meta');
      meta.append(el('small', '', img ? 'Background image' : 'No image yet'));
      const btns = el('div', 'btns');
      const up = el('button', 'btn btn-sm', img ? 'Replace' : 'Choose image');
      up.onclick = () => pickFiles({ type: 'bg', id: s.id }, false);
      btns.append(up);
      meta.append(btns);
      box.append(th, meta);
      panel.append(field('Image', box));
      panel.append(slider('Blur', { min: 0, max: 60, get: () => b.blur || 0, set: (v) => { b.blur = v; }, reset: 0 }));
      panel.append(slider('Darken', { min: 0, max: 0.85, step: 0.01, get: () => b.dim || 0, set: (v) => { b.dim = v; }, fmt: pct, reset: 0 }));
      panel.append(color('Fallback colour', { get: () => b.color, set: (v) => { b.color = v; } }));
    } else {
      const r = el('div', 'row2');
      r.append(color(b.type === 'radial' ? 'Centre' : 'From', { get: () => b.c1, set: (v) => { b.c1 = v; } }));
      r.append(color(b.type === 'radial' ? 'Edge' : 'To', { get: () => b.c2, set: (v) => { b.c2 = v; } }));
      panel.append(r);
      if (b.type !== 'radial') panel.append(slider('Angle', { min: 0, max: 360, get: () => b.angle || 0, set: (v) => { b.angle = v; }, fmt: deg, reset: 180 }));
      const sw = el('button', 'btn btn-sm btn-block', 'Swap colours');
      sw.onclick = () => { [b.c1, b.c2] = [b.c2, b.c1]; commit(); requestRender(s.id); buildPanel(); };
      panel.append(sw);
    }
    panel.append(h3('Effects'));
    if (!Array.isArray(b.glows)) b.glows = [];
    if (b.glows.length) {
      panel.append(slider('Glow', { min: 0, max: 2, step: 0.05, get: () => (b.glowStrength == null ? 1 : b.glowStrength), set: (v) => { b.glowStrength = v; }, fmt: pct, reset: 1 }));
      panel.append(color('Glow colour', { get: () => b.glowColor || b.glows[0].color, set: (v) => { b.glowColor = v; } }));
      const rg = el('button', 'btn btn-sm btn-block', 'Remove glow');
      rg.onclick = () => { b.glows = []; commit(); requestRender(s.id); buildPanel(); };
      panel.append(rg);
    } else {
      const ag = el('button', 'btn btn-sm btn-block', 'Add a glow');
      ag.onclick = () => { b.glows = [{ x: 0.5, y: 0.6, r: 0.5, color: (s.ui && s.ui.accent) || '#7FA88A', a: 0.5 }]; b.glowStrength = 1; b.glowColor = null; commit(); requestRender(s.id); buildPanel(); };
      panel.append(ag);
    }
    panel.append(el('div', 'sec'));
    panel.append(select('Pattern', [['none', 'None'], ['dots', 'Dots'], ['grid', 'Grid'], ['stripes', 'Stripes']], () => b.pattern || 'none', (v) => { b.pattern = v; }));
    if (b.pattern && b.pattern !== 'none') {
      panel.append(color('Pattern colour', { get: () => b.patternColor || '#FFFFFF', set: (v) => { b.patternColor = v; } }));
      panel.append(slider('Pattern strength', { min: 0.02, max: 0.4, step: 0.01, get: () => (b.patternAlpha == null ? 0.1 : b.patternAlpha), set: (v) => { b.patternAlpha = v; }, fmt: pct }));
    }
    panel.append(slider('Grain', { min: 0, max: 1, step: 0.05, get: () => b.grain || 0, set: (v) => { b.grain = v; }, fmt: pct, reset: 0 }));
    panel.append(applyAllButton('Apply to all slides', (src, d) => {
      d.bg = clone(src.bg);
    }));
  }

  function panelText() {
    const s = cur();
    const t = s.text;
    panel.append(el('h2', '', 'Text'), el('p', 'hint', 'Wrap words in *stars* to highlight them. Press Enter for a new line.'));
    panel.append(textarea('Headline', 'f-headline', () => t.headline, (v) => { t.headline = v; }, 2));
    panel.append(textarea('Subtitle', 'f-sub', () => t.sub, (v) => { t.sub = v; }, 2));

    panel.append(h3('Layout'));
    panel.append(seg(null, Object.entries(P.LAYOUTS).map(([k, L]) => [k, L.label]), () => s.layout, (v) => P.applyLayout(s, v)));
    panel.append(el('div', 'sec'));
    panel.append(seg('Align', [['left', ic('alignL'), 'Left'], ['center', ic('alignC'), 'Centre'], ['right', ic('alignR'), 'Right']], () => t.align, (v) => { t.align = v; }));
    panel.append(slider('Position', { min: -0.05, max: 0.97, step: 0.005, get: () => t.y, set: (v) => { t.y = v; s.layout = 'custom'; }, fmt: pct }));
    panel.append(slider('Text width', { min: 0.5, max: 1, step: 0.01, get: () => t.width || 0.86, set: (v) => { t.width = v; }, fmt: pct, reset: 0.86 }));

    panel.append(h3('Headline style'));
    panel.append(select('Font', P.FONTS.map((f) => [f.name, f.name]), () => t.font, (v) => {
      t.font = v;
      t.weight = P.fontWeight(v, t.weight);
    }));
    const F = P.FONTS.find((f) => f.name === t.font) || P.FONTS[0];
    if (F.max > F.min) panel.append(slider('Weight', { min: F.min, max: F.max, step: 50, get: () => P.fontWeight(t.font, t.weight), set: (v) => { t.weight = v; } }));
    panel.append(slider('Size', { min: 24, max: 240, get: () => t.size, set: (v) => { t.size = v; }, fmt: (v) => v + '' }));
    panel.append(slider('Line height', { min: 0.8, max: 1.6, step: 0.01, get: () => t.lh || 1.06, set: (v) => { t.lh = v; }, fmt: (v) => v.toFixed(2), reset: 1.06 }));
    panel.append(slider('Letter spacing', { min: -0.08, max: 0.2, step: 0.005, get: () => t.ls || 0, set: (v) => { t.ls = v; }, fmt: (v) => (v * 100).toFixed(1), reset: 0 }));
    panel.append(toggle('Uppercase', () => t.upper, (v) => { t.upper = v; }));
    const r1 = el('div', 'row2');
    r1.append(color('Colour', { get: () => t.color, set: (v) => { t.color = v; } }));
    r1.append(color('Highlight', { get: () => t.hl, set: (v) => { t.hl = v; } }));
    panel.append(r1);

    panel.append(h3('Accent words (*in stars*)'));
    panel.append(select('Accent font', [['', 'Same as headline']].concat(P.FONTS.map((f) => [f.name, f.name + (f.italic ? ' (has italic)' : '')])), () => t.hlFont || '', (v) => {
      t.hlFont = v || null;
      const f = P.FONTS.find((x) => x.name === (t.hlFont || t.font));
      if (!f || !f.italic) t.hlItalic = false;
      else if (v) t.hlItalic = true;
    }));
    const AF = P.FONTS.find((x) => x.name === (t.hlFont || t.font));
    if (AF && AF.italic) panel.append(toggle('Italic', () => t.hlItalic, (v) => { t.hlItalic = v; }));
    panel.append(toggle('Use highlight colour', () => t.hlColorize !== false, (v) => { t.hlColorize = v; }));
    panel.append(slider('Accent size', { min: 0.8, max: 1.4, step: 0.01, get: () => t.hlScale || 1, set: (v) => { t.hlScale = v; }, fmt: pct, reset: 1 }));

    panel.append(h3('Subtitle style'));
    panel.append(select('Font', P.FONTS.map((f) => [f.name, f.name]), () => t.subFont || t.font, (v) => {
      t.subFont = v;
      t.subWeight = P.fontWeight(v, t.subWeight || 500);
    }));
    const SF = P.FONTS.find((f) => f.name === (t.subFont || t.font)) || P.FONTS[0];
    if (SF.max > SF.min) panel.append(slider('Weight', { min: SF.min, max: SF.max, step: 50, get: () => P.fontWeight(t.subFont || t.font, t.subWeight || 500), set: (v) => { t.subWeight = v; } }));
    panel.append(slider('Size', { min: 18, max: 90, get: () => t.subSize, set: (v) => { t.subSize = v; } }));
    panel.append(color('Colour', { get: () => t.subColor, set: (v) => { t.subColor = v; } }));

    panel.append(applyAllButton('Apply text style to all slides', (src, d) => {
      const keep = { headline: d.text.headline, sub: d.text.sub };
      d.text = Object.assign(clone(src.text), keep);
      d.layout = src.layout;
    }));
  }

  function panelDevice() {
    const s = cur();
    const d = s.device;
    panel.append(el('h2', '', 'Device'), el('p', 'hint', 'Drag the phone on the slide to move it.'));

    panel.append(h3('Screenshot'));
    const box = el('div', 'shot');
    const img = getImage(s.shot);
    const th = el('div', 'thumb', img ? '' : ic('image'));
    if (img) th.style.backgroundImage = `url("${img.src}")`;
    const meta = el('div', 'meta');
    meta.append(el('small', '', img ? `${img.naturalWidth} × ${img.naturalHeight}px` : 'No screenshot yet'));
    const btns = el('div', 'btns');
    const up = el('button', 'btn btn-sm', img ? 'Replace' : 'Upload');
    up.id = 'f-upload';
    up.onclick = () => pickFiles({ type: 'slide', id: s.id }, false);
    btns.append(up);
    if (img) {
      const rm = el('button', 'btn btn-sm', 'Remove');
      rm.onclick = () => { s.shot = null; commit(); requestRender(s.id); buildPanel(); };
      btns.append(rm);
    }
    meta.append(btns);
    box.append(th, meta);
    panel.append(box);

    panel.append(h3('Frame'));
    const autoName = P.FRAMES[P.SIZES[doc.size].frame].label;
    panel.append(seg(null, [['auto', 'Auto', `Matches the export size (${autoName} now)`], ['iphone', 'iPhone'], ['android', 'Android'], ['tablet', 'Tablet'], ['none', 'Bare', 'Screenshot with rounded corners, no frame'], ['hidden', 'Off', 'Text only, no device']], () => d.type, (v) => { d.type = v; }, 'wrap'));
    panel.append(el('div', 'sec'));
    if (d.type !== 'none' && d.type !== 'hidden') {
      const sw = el('div', 'swatches');
      sw.setAttribute('role', 'radiogroup');
      Object.entries(P.FRAME_COLORS).forEach(([k, c]) => {
        const b = el('button', d.color === k ? 'on' : '');
        b.type = 'button';
        b.title = c.label;
        b.setAttribute('aria-label', c.label + ' frame');
        b.style.background = `linear-gradient(135deg, ${c.hi}, ${c.base})`;
        b.onclick = () => { d.color = k; commit(); requestRender(s.id); buildPanel(); };
        sw.append(b);
      });
      panel.append(field('Frame colour', sw));
    }
    if (d.type === 'hidden') return panel.append(applyAllButton('Apply device settings to all slides', (src, dst) => { dst.device = clone(src.device); }));
    if (d.type === 'none') panel.append(slider('Corner radius', { min: 0, max: 0.15, step: 0.005, get: () => d.corner == null ? 0.06 : d.corner, set: (v) => { d.corner = v; }, fmt: pct, reset: 0.06 }));

    panel.append(h3('Position'));
    panel.append(slider('Size', { min: 0.2, max: 1.8, step: 0.01, get: () => d.scale, set: (v) => { d.scale = v; }, fmt: pct, reset: 0.74 }));
    panel.append(slider('Horizontal', { min: -0.3, max: 1.3, step: 0.005, get: () => d.x, set: (v) => { d.x = v; }, fmt: (v) => Math.round((v - 0.5) * 100) + '', reset: 0.5 }));
    panel.append(slider('Vertical', { min: -0.6, max: 1, step: 0.005, get: () => d.y, set: (v) => { d.y = v; s.layout = 'custom'; }, fmt: pct }));
    panel.append(slider('Rotate', { min: -180, max: 180, step: 0.5, get: () => d.rot || 0, set: (v) => { d.rot = v; }, fmt: deg, reset: 0 }));

    panel.append(h3('3D & shadow'));
    panel.append(slider('Tilt left / right', { min: -35, max: 35, step: 0.5, get: () => d.tiltY || 0, set: (v) => { d.tiltY = v; }, fmt: deg, reset: 0 }));
    panel.append(slider('Tilt back / forward', { min: -30, max: 30, step: 0.5, get: () => d.tiltX || 0, set: (v) => { d.tiltX = v; }, fmt: deg, reset: 0 }));
    panel.append(slider('Shadow', { min: 0, max: 1, step: 0.01, get: () => d.shadow == null ? 0.5 : d.shadow, set: (v) => { d.shadow = v; }, fmt: pct, reset: 0.5 }));
    const rs = el('button', 'btn btn-sm btn-block', 'Reset position & tilt');
    rs.onclick = () => {
      Object.assign(d, { x: 0.5, scale: 0.74, rot: 0, tiltX: 0, tiltY: 0 });
      P.applyLayout(s, s.layout in P.LAYOUTS ? s.layout : 'top');
      commit(); requestRender(s.id); buildPanel();
    };
    panel.append(rs);
    panel.append(applyAllButton('Apply device settings to all slides', (src, dst) => { dst.device = clone(src.device); }));
  }

  function newBadge(kind, s) {
    const def = P.BADGE_KINDS[kind];
    const th = doc.theme && P.themeById(doc.theme);
    const c = th ? P.CATEGORY_COPY[th.category] : null;
    const n = (s.badges || []).length;
    const b = { id: 'b' + P.uid(), kind, x: 0.5 + ((n % 3) - 1) * 0.16, y: 0.5 + (n % 2) * 0.06, size: 42, rot: 0 };
    if (kind === 'chip') Object.assign(b, { text: c ? c.chips[n % c.chips.length] : def.text, icon: 'spark' });
    else if (kind === 'bubble') Object.assign(b, { text: c ? c.bubbles[n % 2] : def.text, tail: n % 2 ? 'right' : 'left' });
    else if (kind === 'rating') Object.assign(b, { text: c ? c.rating[0] : def.text, sub: c ? c.rating[1] : def.sub, x: 0.5 });
    else if (kind === 'laurel') Object.assign(b, { text: c ? c.award[0] : def.text, sub: c ? c.award[1] : def.sub, x: 0.5 });
    else if (kind === 'stat') Object.assign(b, { text: c ? c.stat[0] : def.text, sub: c ? c.stat[1] : def.sub });
    else if (kind === 'review') Object.assign(b, { text: c ? c.review[0] : def.text, sub: c ? c.review[1] : def.sub, author: c ? c.review[2] : def.author, x: 0.5, size: 42 });
    else if (kind === 'sparkle') Object.assign(b, { size: 36 });
    else if (kind === 'image') Object.assign(b, { asset: null, size: 40, opacity: 1, shadow: false, radius: 0 });
    return b;
  }

  let keepLayersInView = false;
  /** Short name for an element in the layers list. */
  function layerName(b) {
    const label = P.BADGE_KINDS[b.kind].label;
    const t = (b.text || '').trim();
    return t ? `${label} · ${t.length > 22 ? t.slice(0, 21) + '…' : t}` : label;
  }

  /**
   * Layers list, front at the top. The phone is a fixed row: elements dragged below it sit behind the phone.
   * (The headline always sits between the front elements and the phone.)
   */
  function layersList(s) {
    const wrap = el('div', 'layers');
    wrap.append(h3('Layers'));
    const list = el('div', 'layer-list');
    const hasPhone = s.device.type !== 'hidden';
    // display order, top → bottom
    const items = [];
    s.badges.slice().reverse().forEach((b) => { if (!b.behind || !hasPhone) items.push(b); });
    if (hasPhone) {
      items.push('phone');
      s.badges.slice().reverse().forEach((b) => { if (b.behind) items.push(b); });
    }
    items.forEach((it) => {
      if (it === 'phone') {
        const on = selObj && selObj.slide === s.id && selObj.kind === 'device';
        const row = el('div', 'layer layer-phone' + (on ? ' on' : ''));
        row.append(el('span', 'layer-grip', ic('grip')), el('i', 'layer-th layer-ic', ic('device')), el('span', 'layer-name', 'Phone &amp; screenshot'));
        row.dataset.key = 'phone';
        row.title = 'Drag to move the phone above or below elements';
        list.append(row);
        return;
      }
      const b = it;
      const row = el('div', 'layer' + (b.id === selBadge ? ' on' : ''));
      row.dataset.key = b.id;
      const img = b.kind === 'image' ? getImage(b.asset) : null;
      const th = el('i', 'layer-th');
      if (img) th.style.backgroundImage = `url("${img.src}")`;
      const name = el('span', 'layer-name');
      name.textContent = layerName(b); // user text: never as HTML
      row.append(el('span', 'layer-grip', ic('grip')), th, name);
      row.title = 'Drag to change the order · click to select';
      list.append(row);
    });

    // drag to reorder (pointer events, so it works with mouse, pen and touch)
    // The grabbed row follows the pointer; the rows it passes slide out of its way.
    let dr = null;
    const rows = () => [...list.children];
    list.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.layer');
      if (!row || e.button !== 0) return;
      e.preventDefault();
      list.setPointerCapture(e.pointerId);
      const all = rows();
      const rects = all.map((r) => r.getBoundingClientRect());
      const from = all.indexOf(row);
      const step = all.length > 1 ? rects[1].top - rects[0].top : rects[0].height;
      dr = { row, all, from, to: from, step, y0: e.clientY, moved: false,
        mids: rects.map((r) => r.top + r.height / 2),
        minDy: rects[0].top - rects[from].top, maxDy: rects[rects.length - 1].top - rects[from].top };
    });
    list.addEventListener('pointermove', (e) => {
      const d = dr;
      if (!d) return;
      if (!d.moved && Math.abs(e.clientY - d.y0) < 4) return;
      if (!d.moved) { d.moved = true; d.row.classList.add('dragging'); list.classList.add('sorting'); }
      const dy = clamp(e.clientY - d.y0, d.minDy, d.maxDy);
      d.row.style.transform = `translateY(${dy}px)`;
      // the slot is decided by where the grabbed row's centre is, not by the pointer
      const c = d.mids[d.from] + dy;
      let to = d.from;
      // take a neighbour's slot once the grabbed row is more than halfway into it (so the end slots are reachable)
      const half = d.step / 2;
      while (to < d.all.length - 1 && c > d.mids[to + 1] - half) to++;
      while (to > 0 && c < d.mids[to - 1] + half) to--;
      d.to = to;
      d.all.forEach((r, i) => {
        if (r === d.row) return;
        const shift = d.from < i && i <= to ? -d.step : to <= i && i < d.from ? d.step : 0;
        r.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    });
    const end = () => {
      if (!dr) return;
      const d = dr;
      dr = null;
      list.classList.remove('sorting');
      d.all.forEach((r) => { r.style.transform = ''; r.classList.remove('dragging'); });
      const id = d.row.dataset.key;
      const sel1 = () => (id === 'phone' ? { slide: s.id, kind: 'device' } : { slide: s.id, kind: 'badge', id });
      if (!d.moved) {
        // plain click: select the element (or the phone)
        setSel(sel1());
        keepLayersInView = true;
        buildPanel();
        return;
      }
      if (d.to === d.from) return; // dropped back where it was
      const keys = d.all.map((r) => r.dataset.key);
      keys.splice(d.from, 1);
      keys.splice(d.to, 0, id);
      const byId = new Map(s.badges.map((b) => [b.id, b]));
      let below = false;
      const next = [];
      keys.forEach((k) => {
        if (k === 'phone') { below = true; return; }
        const b = byId.get(k);
        b.behind = hasPhone && below;
        next.push(b);
      });
      s.badges = next.reverse(); // array is bottom → top
      selObj = sel1();
      selBadge = id === 'phone' ? null : id;
      commit();
      requestRender(s.id);
      keepLayersInView = true;
      buildPanel();
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
    wrap.append(list);
    if (hasPhone) wrap.append(el('p', 'hint', 'Top of the list is in front. Drag below “Phone” to tuck an element behind it.'));
    return wrap;
  }

  function panelElements() {
    const s = cur();
    if (!Array.isArray(s.badges)) s.badges = [];
    s.ui = Object.assign(P.defaultUI(), s.ui || {});
    panel.append(el('h2', '', 'Elements'), el('p', 'hint', `Badges and images on slide ${sel + 1}. Drag them on the slide to move them.`));
    const upImg = el('button', 'btn btn-block', `${ic('image')}<span>Upload logo, icon or image</span>`);
    upImg.type = 'button';
    upImg.id = 'f-add-image';
    upImg.title = 'PNG, JPG, WebP or SVG. Transparent PNGs and SVGs work best.';
    upImg.onclick = () => pickFiles({ type: 'element', id: s.id }, true);
    upImg.style.marginBottom = '8px';
    panel.append(upImg);
    const add = el('div', 'addgrid');
    Object.entries(P.BADGE_KINDS).forEach(([k, def]) => {
      if (k === 'image') return; // added with the upload button above
      const b = el('button', 'btn btn-sm', `${ic('plus')}<span>${def.label}</span>`);
      b.type = 'button';
      b.dataset.kind = k;
      b.onclick = () => {
        const nb = newBadge(k, s);
        s.badges.push(nb);
        selObj = { slide: s.id, kind: 'badge', id: nb.id };
        selBadge = nb.id;
        commit();
        requestRender(s.id);
        buildPanel();
      };
      add.append(b);
    });
    panel.append(add);
    if (!s.badges.length) panel.append(el('p', 'empty', 'No elements on this slide yet. Add one above.'));
    else panel.append(layersList(s));
    // same order as the layers list: front first
    const back = s.device.type !== 'hidden';
    s.badges.slice().reverse().sort((a, c) => (back ? (a.behind ? 1 : 0) - (c.behind ? 1 : 0) : 0)).forEach((b) => {
      const box = el('div', 'el' + (b.id === selBadge ? ' on' : ''));
      box.dataset.id = b.id;
      const head = el('div', 'el-head');
      head.append(el('b', '', P.BADGE_KINDS[b.kind].label));
      const acts = el('div', 'el-acts');
      const dup = el('button', 'icon-btn', ic('copy'));
      dup.title = 'Duplicate';
      dup.setAttribute('aria-label', 'Duplicate element');
      dup.onclick = () => { const c2 = clone(b); c2.id = 'b' + P.uid(); c2.x = Math.min(1, b.x + 0.05); c2.y = Math.min(1, b.y + 0.03); s.badges.push(c2); selBadge = c2.id; commit(); requestRender(s.id); buildPanel(); };
      const del = el('button', 'icon-btn', ic('trash'));
      del.title = 'Delete';
      del.setAttribute('aria-label', 'Delete element');
      del.onclick = () => { s.badges = s.badges.filter((x) => x !== b); if (selBadge === b.id) selBadge = null; commit(); requestRender(s.id); buildPanel(); };
      const fr = el('button', 'icon-btn', ic('toFront'));
      fr.title = 'Bring to front (Ctrl+])';
      fr.setAttribute('aria-label', 'Bring to front');
      fr.onclick = () => restack(s, b.id, 'front');
      const bk = el('button', 'icon-btn', ic('toBack'));
      bk.title = 'Send to back (Ctrl+[)';
      bk.setAttribute('aria-label', 'Send to back');
      bk.onclick = () => restack(s, b.id, 'back');
      acts.append(fr, bk, dup, del);
      head.append(acts);
      box.append(head);
      const k = b.kind;
      if (k === 'image') {
        const sh = el('div', 'shot');
        const img = getImage(b.asset);
        const th = el('div', 'thumb thumb-sq', img ? '' : ic('image'));
        if (img) th.style.backgroundImage = `url("${img.src}")`;
        const meta = el('div', 'meta');
        meta.append(el('small', '', img ? `${img.naturalWidth} × ${img.naturalHeight}px` : 'Image missing'));
        const btns = el('div', 'btns');
        const rep = el('button', 'btn btn-sm', 'Replace');
        rep.type = 'button';
        rep.onclick = () => pickFiles({ type: 'element', id: s.id, badge: b.id }, false);
        btns.append(rep);
        meta.append(btns);
        sh.append(th, meta);
        box.append(sh);
        const ri = el('div', 'row2');
        ri.append(slider('Opacity', { min: 0.1, max: 1, step: 0.01, get: () => (b.opacity == null ? 1 : b.opacity), set: (v) => { b.opacity = v; }, fmt: pct, reset: 1 }));
        ri.append(slider('Rounded', { min: 0, max: 1, step: 0.01, get: () => b.radius || 0, set: (v) => { b.radius = v; }, fmt: pct, reset: 0 }));
        box.append(ri);
        box.append(toggle('Shadow', () => b.shadow, (v) => { b.shadow = v; }));
      }
      if (k !== 'sparkle' && k !== 'image') box.append(textInput(k === 'review' ? 'Title' : k === 'stat' ? 'Number' : 'Text', () => b.text, (v) => { b.text = v; }));
      if (k === 'rating' || k === 'laurel' || k === 'stat') box.append(textInput('Small text', () => b.sub, (v) => { b.sub = v; }));
      if (k === 'review') {
        const ta = el('textarea', 'inp');
        ta.rows = 3;
        ta.value = b.sub || '';
        ta.setAttribute('aria-label', 'Quote');
        ta.addEventListener('input', () => { b.sub = ta.value; requestRender(s.id); textChanged(); });
        ta.addEventListener('blur', flushText);
        box.append(field('Quote', ta));
        box.append(textInput('Author', () => b.author, (v) => { b.author = v; }));
      }
      if (k === 'chip') box.append(seg('Icon', [['spark', 'Sparkle'], ['dot', 'Dot'], ['star', 'Star'], ['none', 'None']], () => b.icon || 'none', (v) => { b.icon = v; }));
      if (k === 'bubble') box.append(seg('Tail', [['left', 'Left'], ['right', 'Right']], () => b.tail || 'left', (v) => { b.tail = v; }));
      const r = el('div', 'row2');
      r.append(slider('Size', { min: 12, max: 160, get: () => b.size || 40, set: (v) => { b.size = v; } }));
      r.append(slider('Rotate', { min: -180, max: 180, step: 0.5, get: () => b.rot || 0, set: (v) => { b.rot = v; }, fmt: deg, reset: 0 }));
      box.append(r);
      if (s.device.type !== 'hidden') box.append(toggle('Behind the phone', () => b.behind, (v) => { b.behind = v; }));
      box.addEventListener('focusin', () => {
        if (!selObj || selObj.id !== b.id) setSel({ slide: s.id, kind: 'badge', id: b.id });
      });
      panel.append(box);
    });

    panel.append(h3('Element style'));
    panel.append(select('Font', P.FONTS.map((f) => [f.name, f.name]), () => s.ui.font, (v) => { s.ui.font = v; }));
    const r1 = el('div', 'row2');
    r1.append(color('Chip colour', { get: () => s.ui.chipBg, set: (v) => { s.ui.chipBg = v; } }));
    r1.append(color('Chip text', { get: () => s.ui.chipText, set: (v) => { s.ui.chipText = v; } }));
    panel.append(r1);
    const r2 = el('div', 'row2');
    r2.append(color('Stars', { get: () => s.ui.star, set: (v) => { s.ui.star = v; } }));
    r2.append(color('Sparkles', { get: () => s.ui.accent, set: (v) => { s.ui.accent = v; } }));
    panel.append(r2);
    panel.append(applyAllButton('Apply element style to all slides', (src, d) => { d.ui = clone(src.ui); }));
    if (s.badges.length) {
      const rm = el('button', 'btn btn-block', 'Remove all elements from this slide');
      rm.style.marginTop = '8px';
      rm.onclick = () => { s.badges = []; selBadge = null; commit(); requestRender(s.id); buildPanel(); };
      panel.append(rm);
    }
    const on = panel.querySelector('.el.on');
    // jump to the selected card, except when the click/drag came from the layers list (keep the list in view)
    if (on && !keepLayersInView) requestAnimationFrame(() => on.scrollIntoView({ block: 'nearest' }));
    keepLayersInView = false;
  }

  /* ───────── export ───────── */
  const exportSel = new Set(['ios69', 'gpPhone']);
  function openExport() {
    flushText();
    const body = $('exBody');
    body.innerHTML = '';
    if (P.extras) body.append(P.extras.preflightSummary());
    const groups = {};
    Object.entries(P.SIZES).forEach(([k, s]) => (groups[s.store] = groups[s.store] || []).push([k, s]));
    groups['Google Play'].push(['feature', P.FEATURE]);
    const sum = el('div', 'exsum');
    const updateSum = () => {
      const n = doc.slides.length;
      let count = 0;
      exportSel.forEach((k) => { count += k === 'feature' ? 1 : P.SIZES[k].store === 'Google Play' ? Math.min(n, PLAY_MAX) : n; });
      sum.textContent = count ? `${count} image${count === 1 ? '' : 's'} · flat RGB PNGs with no transparency, ready to upload.` : 'Pick at least one size.';
      if (n > PLAY_MAX && [...exportSel].some((k) => k !== 'feature' && P.SIZES[k].store === 'Google Play')) sum.textContent += ` Google Play allows ${PLAY_MAX} screenshots, so it gets the first ${PLAY_MAX}.`;
      $('exGo').disabled = !count;
    };
    Object.entries(groups).forEach(([store, items]) => {
      const g = el('div', 'exgroup');
      g.append(el('h4', '', store));
      items.forEach(([k, s]) => {
        const lab = el('label', 'exitem');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.checked = exportSel.has(k);
        cb.dataset.size = k;
        cb.onchange = () => { cb.checked ? exportSel.add(k) : exportSel.delete(k); updateSum(); };
        lab.append(cb, el('span', 't', s.label), el('span', 'd', `${s.w}×${s.h}`));
        if (s.note) lab.append(el('span', 'n' + (s.note === 'Required' ? ' req' : ''), s.note));
        if (k === 'feature') lab.append(el('span', 'n', 'Uses slide 1'));
        g.append(lab);
        if (k === 'feature') {
          const fc = P.mkCanvas(P.FEATURE.w / 2, P.FEATURE.h / 2);
          fc.className = 'feat-prev';
          const tmp = P.renderSize(doc.slides[0], 'feature', getImage);
          fc.getContext('2d').drawImage(tmp, 0, 0, fc.width, fc.height);
          g.append(fc);
        }
      });
      body.append(g);
    });
    body.append(sum);
    updateSum();
    $('exProgress').classList.remove('on');
    $('exGo').textContent = 'Download ZIP';
    openModal('exportModal');
  }

  let exporting = false;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  }
  async function runExport() {
    if (exporting || !exportSel.size) return;
    if (typeof JSZip === 'undefined') return toast('The ZIP library didn’t load. Refresh and try again.');
    exporting = true;
    const go = $('exGo');
    go.disabled = true;
    $('exOne').disabled = true;
    $('exProgress').classList.add('on');
    try {
      await P.ensureFonts(doc.slides.flatMap((s) => [s.text.font, s.text.subFont]));
      const jobs = [];
      const order = [...Object.keys(P.SIZES), 'feature'].filter((k) => exportSel.has(k));
      for (const k of order) {
        if (k === 'feature') { jobs.push({ k, slide: doc.slides[0], path: 'Google Play/Feature graphic - 1024x500.png' }); continue; }
        const S = P.SIZES[k];
        const list = S.store === 'Google Play' ? doc.slides.slice(0, PLAY_MAX) : doc.slides;
        list.forEach((slide, i) => jobs.push({ k, slide, path: `${S.store}/${S.folder}/${String(i + 1).padStart(2, '0')}.png` }));
      }
      const zip = new JSZip();
      const root = zip.folder('Paneful screenshots');
      for (let i = 0; i < jobs.length; i++) {
        $('exText').textContent = `Rendering ${i + 1} of ${jobs.length}`;
        $('exBar').style.width = (i / jobs.length) * 100 + '%';
        await tick();
        const c = P.renderSize(jobs[i].slide, jobs[i].k, getImage);
        root.file(jobs[i].path, await P.canvasToPNG(c));
        c.width = c.height = 1; // free memory
      }
      $('exText').textContent = 'Zipping…';
      $('exBar').style.width = '100%';
      await tick();
      const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      download(out, 'paneful-screenshots.zip');
      $('exText').textContent = `Done · ${jobs.length} images`;
      toast('Your ZIP is downloading');
    } catch (e) {
      console.error(e);
      $('exText').textContent = 'Export failed';
      toast('Export failed. Try fewer sizes, or refresh and try again.');
    } finally {
      exporting = false;
      go.disabled = false;
      $('exOne').disabled = false;
    }
  }
  async function exportCurrent() {
    try {
      await P.ensureFonts([cur().text.font, cur().text.subFont]);
      const c = P.renderSize(cur(), doc.size, getImage);
      const S = P.SIZES[doc.size];
      download(await P.canvasToPNG(c), `paneful-slide-${sel + 1}-${S.w}x${S.h}.png`);
    } catch (e) {
      console.error(e);
      toast('Couldn’t export this slide.');
    }
  }

  /* ───────── modals, menu, toast ───────── */
  function openModal(id) { $(id).classList.add('open'); }
  function closeModal(id) { $(id).classList.remove('open'); }
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('mousedown', (e) => { if (e.target === m && !exporting) closeModal(m.id); });
    m.querySelectorAll('[data-close]').forEach((b) => { b.innerHTML = ic('x'); b.onclick = () => { if (!exporting) closeModal(m.id); }; });
  });
  let dlgResolve = null;
  function dialog(title, html, okLabel, cancelLabel) {
    $('dlgTitle').textContent = title;
    $('dlgBody').innerHTML = html;
    $('dlgOk').textContent = okLabel || 'OK';
    $('dlgCancel').style.display = cancelLabel === false ? 'none' : '';
    $('dlgCancel').textContent = cancelLabel || 'Cancel';
    openModal('dialog');
    setTimeout(() => $('dlgOk').focus(), 30);
    return new Promise((res) => { dlgResolve = res; });
  }
  const dlgDone = (v) => { closeModal('dialog'); if (dlgResolve) { const r = dlgResolve; dlgResolve = null; r(v); } };
  $('dlgOk').onclick = () => dlgDone(true);
  $('dlgCancel').onclick = () => dlgDone(false);
  new MutationObserver(() => { if (!$('dialog').classList.contains('open') && dlgResolve) dlgDone(false); }).observe($('dialog'), { attributes: true, attributeFilter: ['class'] });

  let toastTimer = 0;
  function toast(msg, actLabel, act) {
    const t = $('toast');
    t.innerHTML = '';
    t.append(el('span', '', msg));
    if (actLabel) {
      const b = el('button', '', actLabel);
      b.onclick = () => { t.classList.remove('on'); act(); };
      t.append(b);
    }
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), actLabel ? 4500 : 2400);
  }

  const menu = $('menu');
  $('menuBtn').onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
  document.addEventListener('mousedown', (e) => { if (!menu.contains(e.target) && e.target !== $('menuBtn')) menu.classList.remove('open'); });
  menu.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    menu.classList.remove('open');
    const act = b.dataset.act;
    if (act === 'new') {
      if (await dialog('Start a new project?', '<p>This clears the current slides. You can undo it right after, or save a project file first.</p>', 'Start fresh')) newProject();
    } else if (act === 'demo') {
      if (await dialog('Load the demo project?', '<p>This replaces the current slides with the demo. You can undo it right after.</p>', 'Load demo')) loadDemo();
    } else if (act === 'saveFile') saveProjectFile();
    else if (act === 'openFile') { $('projInput').value = ''; $('projInput').click(); }
    else if (act === 'keys') showKeys();
  });

  function showKeys() {
    const rows = [['Undo', `${MOD} Z`], ['Redo', `${MOD} Shift Z`], ['Duplicate slide', `${MOD} D`], ['Delete slide', 'Delete'], ['Previous / next slide', '← →'], ['Export', `${MOD} E`], ['Element to front / back', `${MOD} ] [`], ['Paste screenshot', `${MOD} V`]];
    dialog('Keyboard shortcuts', `<table class="keys">${rows.map(([a, k]) => `<tr><td>${a}</td><td>${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join(' ')}</td></tr>`).join('')}</table>`, 'Done', false);
  }

  /* ───────── project files ───────── */
  const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  async function saveProjectFile() {
    flushText();
    try {
      const out = { app: 'paneful', v: 1, project: doc, assets: {} };
      for (const id of usedAssetIds(doc)) { const a = assets.get(id); if (a) out.assets[id] = await blobToDataURL(a.blob); }
      download(new Blob([JSON.stringify(out)], { type: 'application/json' }), 'paneful-project.json');
      toast('Project file saved');
    } catch (e) {
      console.error(e);
      toast('Couldn’t save the project file.');
    }
  }
  $('projInput').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || data.app !== 'paneful') throw new Error('not a paneful file');
      const d = normalizeDoc(data.project);
      if (!d) throw new Error('no slides');
      for (const [id, url] of Object.entries(data.assets || {})) {
        if (assets.has(id)) continue;
        const blob = await (await fetch(url)).blob();
        try { assets.set(id, { blob, img: await decodeBlob(blob) }); await DB.set('assets', id, blob); } catch (x) { /* skip */ }
      }
      replaceDoc(d);
      toast('Project opened');
    } catch (err) {
      console.error(err);
      toast('That file isn’t a Paneful project.');
    }
  });

  function replaceDoc(d) {
    doc.slides = d.slides;
    doc.theme = d.theme;
    doc.variant = d.variant | 0;
    if (d.size) doc.size = d.size;
    sel = 0;
    commit();
    syncSize();
    buildStrip();
    buildPanel();
  }
  function newProject() {
    const s = P.defaultSlide();
    const th = P.themeById(doc.theme) || P.THEMES[0];
    P.applyTheme(s, th, 0, doc.variant | 0);
    replaceDoc({ slides: [s], theme: th.id, variant: doc.variant | 0 });
  }
  async function demoSlides() {
    const canvases = await P.demoCanvases();
    const th = P.themeById('nova');
    const slides = [];
    for (let i = 0; i < canvases.length; i++) {
      const blob = await new Promise((r) => canvases[i].toBlob(r, 'image/png'));
      const s = P.defaultSlide();
      s.shot = await addAsset(blob);
      Object.assign(s.text, P.DEMO_TEXT[i]);
      P.applyTheme(s, th, i, 0);
      slides.push(s);
    }
    return { slides, theme: th.id, variant: 0 };
  }
  async function loadDemo() {
    replaceDoc(await demoSlides());
  }

  /* ───────── top bar ───────── */
  function syncSize() { $('size').value = doc.size; }
  function buildTop() {
    $('undo').innerHTML = ic('undo');
    $('redo').innerHTML = ic('redo');
    $('menuBtn').innerHTML = ic('more');
    $('sizeIc').innerHTML = ic('device');
    $('exportBtn').innerHTML = `${ic('download')}<span>Export</span>`;
    const sz = $('size');
    sz.innerHTML = '';
    const groups = {};
    Object.entries(P.SIZES).forEach(([k, s]) => {
      if (!groups[s.store]) { groups[s.store] = el('optgroup'); groups[s.store].label = s.store; sz.append(groups[s.store]); }
      const o = el('option', '', `${s.store === 'Google Play' ? 'Play ' : ''}${s.label} · ${s.w}×${s.h}`);
      o.value = k;
      groups[s.store].append(o);
    });
    sz.onchange = () => {
      doc.size = sz.value;
      save();
      buildStrip();
      if (tab === 'device') buildPanel();
    };
    $('undo').onclick = undo;
    $('redo').onclick = redo;
    $('exportBtn').onclick = openExport;
    $('previewBtn').innerHTML = `${ic('eye')}<span>Preview</span>`;
    $('checkBtn').innerHTML = `${ic('check')}<span>Check</span><em id="checkCount"></em>`;
    $('previewBtn').onclick = () => P.extras && P.extras.openPreview();
    $('checkBtn').onclick = () => P.extras && P.extras.openCheck();
    $('exGo').onclick = runExport;
    $('exOne').onclick = exportCurrent;
  }

  /* ───────── keyboard ───────── */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'color'].includes(t.type)) || t.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (e.key === 'Escape') {
      menu.classList.remove('open');
      if (selObj && !$('dialog').classList.contains('open') && !$('exportModal').classList.contains('open')) setSel(null);
      if ($('dialog').classList.contains('open')) dlgDone(false);
      else if ($('exportModal').classList.contains('open') && !exporting) closeModal('exportModal');
      else ['previewModal', 'checkModal'].forEach((m) => { if ($(m) && $(m).classList.contains('open')) closeModal(m); });
      return;
    }
    if (document.querySelector('.modal.open')) return;
    if (mod && key === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && key === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (mod && key === 'e') { e.preventDefault(); openExport(); return; }
    if (typing) return;
    if (e.key === 'Escape' && selObj) { setSel(null); return; }
    if (mod && (e.key === ']' || e.key === '[') && selObj && selObj.kind === 'badge') {
      e.preventDefault();
      const s = doc.slides.find((x) => x.id === selObj.slide);
      if (s) restack(s, selObj.id, e.key === ']' ? 'front' : 'back');
      return;
    }
    if (!mod && t && t.tagName !== 'INPUT' && keySelected(e)) { e.preventDefault(); return; }
    const onControl = t && t.tagName === 'INPUT'; // sliders/checkboxes use arrow keys themselves
    if (onControl && e.key.startsWith('Arrow')) return;
    if (mod && key === 'd') { e.preventDefault(); duplicateSlide(sel); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) { e.preventDefault(); deleteSlide(sel); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); selectSlide(sel - 1, { scroll: true }); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); selectSlide(sel + 1, { scroll: true }); }
  });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(buildStrip, 120); });
  window.addEventListener('beforeunload', () => { if (textTimer) { clearTimeout(textTimer); commit(); } });

  /* ───────── boot ───────── */
  async function boot() {
    buildTop();
    buildRail();
    await P.ensureFonts(P.FONTS.map((f) => f.name));
    let saved = null;
    try { saved = await DB.get('kv', 'project'); } catch (e) { saved = null; }
    const d = normalizeDoc(saved);
    if (d) {
      doc = d;
      await Promise.all([...usedAssetIds(doc)].map(loadAsset));
    } else {
      doc = { v: 1, size: 'ios69', theme: null, slides: [] };
      Object.assign(doc, await demoSlides());
      save();
    }
    doc.meta = Object.assign(defaultMeta(), doc.meta || {});
    resetHistory();
    syncSize();
    buildStrip();
    buildPanel();
    gcAssets().catch(() => {});
    $('saveState').textContent = 'Saved';
    // landing page theme links: /app/?theme=paper (undoable)
    const qs = new URLSearchParams(location.search);
    const qTheme = qs.get('theme');
    if (qTheme) {
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// */ }
      const qv = +qs.get('v') || 0;
      if (P.themeById(qTheme)) applyThemeAll(qTheme, qv);
    }
    window.PANEFUL_READY = true;
  }
  // test hook (read-only view of state)
  window.__paneful = { get doc() { return doc; }, get sel() { return sel; }, undo, redo, get hist() { return hist; } };
  // internal API for assets/js/extras.js (store preview, pre-flight check, colour matching)
  P.editor = {
    get doc() { return doc; }, get sel() { return sel; },
    getImage, addAsset, commit, requestRender, buildPanel, showTab, toast, openModal, closeModal, el, ic, clone,
    normalizeSlide, applyThemeAll, flushText, save,
    selectSlide: (i) => selectSlide(i, { scroll: true, panel: true }),
    pickScreenshot: (slideId) => pickFiles({ type: 'slide', id: slideId }, false),
    refreshPanel: () => buildPanel(),
  };
  boot().catch((e) => {
    console.error(e);
    window.PANEFUL_ERROR = String(e && e.stack || e);
    toast('Something went wrong while loading. Refresh the page.');
  });
})();
