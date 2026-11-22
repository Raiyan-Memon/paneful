/* Paneful extras — no AI, no network, all in the browser:
 *  1. Store preview: your slides inside App Store and Google Play layouts (search + app page, light + dark)
 *  2. Pre-flight check: readability, contrast, overlaps, missing screenshots… with one-click fixes
 *  3. Match my app's colours: colour quantisation over your screenshots → three colourways */
(function () {
  'use strict';
  const P = (window.Paneful = window.Paneful || {});
  const ED = () => P.editor;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ───────── colour helpers ───────── */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const mk = (w, h) => P.mkCanvas(w, h);

  /* ═════════════ 3. Match my app's colours ═════════════ */
  function screenshotImages() {
    const E = ED();
    const seen = new Set();
    const out = [];
    E.doc.slides.forEach((s) => {
      if (s.shot && !seen.has(s.shot)) {
        seen.add(s.shot);
        const img = E.getImage(s.shot);
        if (img) out.push(img);
      }
    });
    return out;
  }

  /** Finds the main colours in a set of images. Hue histogram (24 bins) over saturated pixels. */
  P.extractColours = function (imgs) {
    const W = 60, H = 130;
    const c = mk(W, H);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const bins = Array.from({ length: 24 }, () => ({ n: 0, s: 0, l: 0, r: 0, g: 0, b: 0 }));
    let total = 0;
    imgs.forEach((img) => {
      ctx.clearRect(0, 0, W, H);
      try { ctx.drawImage(img, 0, 0, W, H); } catch (e) { return; }
      const d = ctx.getImageData(0, 0, W, H).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        total++;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (s < 0.25 || l < 0.12 || l > 0.9) continue;
        const bn = bins[Math.floor(h / 15) % 24];
        bn.n++; bn.s += s; bn.l += l; bn.r += d[i]; bn.g += d[i + 1]; bn.b += d[i + 2];
      }
    });
    const list = bins
      .map((b, i) => (b.n ? { i, n: b.n, h: rgbToHsl(b.r / b.n, b.g / b.n, b.b / b.n)[0], s: b.s / b.n, l: b.l / b.n, hex: '#' + [b.r, b.g, b.b].map((v) => Math.round(v / b.n).toString(16).padStart(2, '0')).join('').toUpperCase() } : null))
      .filter(Boolean)
      .sort((a, b) => b.n * (0.6 + b.s) - a.n * (0.6 + a.s));
    if (!list.length || list[0].n < total * 0.004) {
      return {
        neutral: true, found: [],
        palettes: [
          { name: 'Ink', colours: ['#0E0E10', '#26262B', '#E9E6DF'] },
          { name: 'Paper', colours: ['#F7F7F5', '#E6E6E2', '#111114'] },
          { name: 'Graphite', colours: ['#1B1C1F', '#33353B', '#7FA88A'] },
        ],
      };
    }
    const main = list[0];
    const second = list.find((x) => hueDist(x.h, main.h) >= 40 && x.n >= main.n * 0.12) || null;
    const H0 = main.h, S = clamp(main.s, 0.35, 0.9);
    const accentDeep = second ? hsl(second.h, Math.max(second.s, 0.6), 0.68) : hsl(H0, Math.min(1, S + 0.1), 0.7);
    const accentSoft = second ? hsl(second.h, Math.max(second.s, 0.6), 0.42) : hsl(H0, Math.max(S, 0.6), 0.4);
    const accentBold = second ? hsl(second.h, 0.9, 0.78) : '#FFFFFF';
    return {
      neutral: false,
      found: [main.hex].concat(second ? [second.hex] : []),
      palettes: [
        { name: 'Deep', colours: [hsl(H0, S * 0.75, 0.08), hsl(H0, S * 0.8, 0.23), accentDeep] },
        { name: 'Soft', colours: [hsl(H0, 0.5, 0.965), hsl(H0, 0.55, 0.87), accentSoft] },
        { name: 'Bold', colours: [hsl(H0, Math.max(S, 0.65), 0.5), hsl(H0 + 18, Math.max(S, 0.6), 0.6), accentBold] },
      ],
    };
  };

  let matched = null;
  function colourCard() {
    const E = ED();
    const el = E.el;
    const box = el('div', 'match');
    box.id = 'matchCard';
    const imgs = screenshotImages();
    const head = el('div', 'match-head');
    head.append(el('span', 'match-ic', E.ic('drop')));
    const txt = el('div', 'match-txt');
    txt.append(el('b', '', 'Match my app’s colours'), el('small', '', imgs.length ? 'Builds colourways from your screenshots' : 'Add a screenshot first'));
    head.append(txt);
    const btn = el('button', 'btn btn-sm', matched ? 'Find again' : 'Find colours');
    btn.id = 'matchBtn';
    btn.type = 'button';
    btn.disabled = !imgs.length;
    btn.onclick = () => {
      matched = P.extractColours(screenshotImages());
      box.replaceWith(colourCard());
    };
    head.append(btn);
    box.append(head);
    if (matched) {
      if (matched.found.length) {
        const f = el('div', 'match-found');
        f.append(el('small', '', 'Found:'));
        matched.found.forEach((hex) => { const i = el('i'); i.style.background = hex; i.title = hex; f.append(i); });
        box.append(f);
      } else {
        box.append(el('small', 'match-note', 'Your screenshots are mostly neutral, so here are neutral colourways.'));
      }
      const row = el('div', 'match-opts');
      const doc = E.doc;
      const themeId = doc.theme || 'nova';
      matched.palettes.forEach((p) => {
        const active = doc.variant === 3 && doc.custom && doc.custom.join() === p.colours.join();
        const b = el('button', 'match-opt' + (active ? ' on' : ''));
        b.type = 'button';
        b.dataset.palette = p.name;
        const sw = el('span', 'sw');
        sw.style.background = `linear-gradient(135deg, ${p.colours[0]} 0 50%, ${p.colours[1]} 50% 72%, ${p.colours[2]} 72% 100%)`;
        b.append(sw, el('span', '', p.name));
        b.title = `Apply ${p.name} colours to the ${(P.themeById(themeId) || {}).name || ''} theme`;
        b.onclick = () => {
          E.applyThemeAll(themeId, 3, p.colours);
          const card = $('matchCard');
          if (card) card.replaceWith(colourCard());
        };
        row.append(b);
      });
      box.append(row);
      box.append(el('small', 'match-note', `Applies to the ${(P.themeById(themeId) || {}).name || 'current'} theme. Pick any theme below and press again to restyle it.`));
    }
    return box;
  }

  /* ═════════════ 2. Pre-flight check ═════════════ */
  const CHECK_SIZES = ['ios69', 'gpPhone'];
  const LABEL = { ios69: 'iPhone', gpPhone: 'Google Play' };
  const lumRGB = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const inter = (a, b) => {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
  };

  /** Renders a slide small and measures what matters. */
  function measure(slide, key) {
    const E = ED();
    const S = P.SIZES[key];
    const W = 300, H = Math.round((W * S.h) / S.w);
    const c = mk(W, H);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const boxes = P.render(ctx, W, H, slide, { frame: S.frame, getImage: E.getImage });
    const t = boxes.text;
    const r = { W, H, boxes, lines: 0, contrast: 21, bgAvg: null, overlap: null, offCanvas: false, badgeOff: [], badgeOverText: [] };
    if (!slide.text.headline && !slide.text.sub) return r;
    const lay = P.layoutText(ctx, slide.text, boxes.scale, boxes.ref.w * boxes.scale * (slide.text.width || 0.86));
    r.lines = lay.head ? lay.head.lines.length : 0;
    // contrast: background without the text, sampled under the text box
    const bare = E.clone(slide);
    bare.text.headline = '';
    bare.text.sub = '';
    bare.badges = []; // elements covering text are reported separately
    const c2 = mk(W, H);
    const ctx2 = c2.getContext('2d', { willReadFrequently: true });
    P.render(ctx2, W, H, bare, { frame: S.frame, getImage: E.getImage });
    const x0 = clamp(Math.floor(t.x), 0, W - 1), y0 = clamp(Math.floor(t.y), 0, H - 1);
    const x1 = clamp(Math.ceil(t.x + t.w), x0 + 1, W), y1 = clamp(Math.ceil(t.y + (lay.head ? lay.head.height : t.h)), y0 + 1, H);
    const d = ctx2.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const [tr, tg, tb] = P.hexToRgb(slide.text.color);
    const tl = lumRGB(tr, tg, tb);
    const cs = [];
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let i = 0; i < d.length; i += 8) {
      const L = lumRGB(d[i], d[i + 1], d[i + 2]);
      cs.push((Math.max(L, tl) + 0.05) / (Math.min(L, tl) + 0.05));
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
    }
    if (cs.length) {
      cs.sort((a, b) => a - b);
      r.contrast = cs[Math.floor(cs.length * 0.12)];
      r.bgAvg = '#' + [sr, sg, sb].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
    }
    // overlap with the phone
    if (boxes.device && slide.text.headline) {
      const head = { x: t.x, y: t.y, w: t.w, h: lay.head ? lay.head.height : t.h };
      const I = inter(head, boxes.device);
      if (I && I.h > head.h * 0.12 && I.w > head.w * 0.15) r.overlap = { textAbove: t.y + t.h / 2 < boxes.device.y + boxes.device.h / 2 };
    }
    r.offCanvas = t.x < -1 || t.x + t.w > W + 1 || t.y < -1 || t.y + t.h > H + 1;
    (boxes.badges || []).forEach((b) => {
      if (b.cx < 0 || b.cx > W || b.cy < 0 || b.cy > H) r.badgeOff.push(b.id);
      const I = inter(b, t);
      if (I && I.w * I.h > b.w * b.h * 0.3) r.badgeOverText.push(b.id);
    });
    return r;
  }

  /* fixes: each mutates the slide; the caller commits.
   * Shrinking never goes below MIN_SIZE, the smallest headline that still reads in search results. */
  const MIN_SIZE = 84;
  const shrink = (s, f) => { const n = Math.max(MIN_SIZE, Math.round(s.text.size * f)); const did = n < s.text.size; s.text.size = n; return did; };
  const FIX = {
    small(s) { s.text.size = Math.max(s.text.size, 92); s.text.subSize = Math.max(s.text.subSize, 40); },
    lines(s, key) {
      for (let k = 0; k < 8 && measure(s, key).lines > 3; k++) {
        if (!shrink(s, 0.9)) s.text.width = Math.min(0.96, (s.text.width || 0.86) + 0.03);
      }
    },
    contrast(s, key) {
      const m = measure(s, key);
      const bg = m.bgAvg || s.bg.color;
      const text = P.contrast('#FFFFFF', bg) >= P.contrast('#111114', bg) ? '#FFFFFF' : '#111114';
      s.text.color = text;
      s.text.subColor = P.mix(text, bg, 0.28);
      if (s.text.hlColorize !== false && P.contrast(s.text.hl, bg) < 2.5) s.text.hl = text;
    },
    overlap(s, key) {
      for (let k = 0; k < 14; k++) {
        const m = measure(s, key);
        if (!m.overlap) return;
        if (k < 4 && shrink(s, 0.93)) { s.text.subSize = Math.max(34, Math.round(s.text.subSize * 0.95)); }
        else if (m.overlap.textAbove) { if (s.text.y > 0.035) s.text.y = +(s.text.y - 0.01).toFixed(3); s.device.y = +(s.device.y + 0.02).toFixed(3); }
        else { s.text.y = +Math.min(0.97, s.text.y + 0.012).toFixed(3); s.device.y = +(s.device.y - 0.02).toFixed(3); }
      }
    },
    offcanvas(s, key) {
      s.text.width = Math.min(s.text.width || 0.86, 0.9);
      for (let k = 0; k < 6; k++) {
        const m = measure(s, key);
        if (!m.offCanvas) return;
        const t = m.boxes.text;
        if (t.y < 0) s.text.y = 0.04;
        if (!shrink(s, 0.92)) s.text.width = Math.max(0.7, (s.text.width || 0.86) - 0.04);
      }
    },
    badgeOff(s) { (s.badges || []).forEach((b) => { b.x = clamp(b.x, 0.08, 0.92); b.y = clamp(b.y, 0.04, 0.96); }); },
    badgeText(s, key, ids) {
      const m = measure(s, key);
      const t = m.boxes.text;
      (s.badges || []).forEach((b) => {
        if (!ids.includes(b.id)) return;
        const bb = (m.boxes.badges || []).find((x) => x.id === b.id);
        if (!bb) return;
        const py = t.y + t.h + bb.h * 0.75;
        b.y = +((py - m.boxes.oy) / (m.boxes.ref.h * m.boxes.scale)).toFixed(3);
      });
    },
  };

  /** Runs every check. Returns a list of issues. */
  P.preflight = function () {
    const E = ED();
    const doc = E.doc;
    const issues = [];
    const add = (o) => {
      const dup = issues.find((x) => x.slideId === o.slideId && x.type === o.type);
      if (dup) { if (o.size && !dup.sizes.includes(o.size)) dup.sizes.push(o.size); return; }
      issues.push(Object.assign({ sizes: o.size ? [o.size] : [] }, o));
    };
    if (doc.slides.length < 3) add({ sev: 'info', type: 'few', msg: 'Apple shows the first 3 screenshots in search results. Add at least 3 slides so the row isn’t empty.' });
    if (doc.slides.length > 8) add({ sev: 'info', type: 'play8', msg: `Google Play only uses 8 screenshots, so slides 9–${doc.slides.length} are left out of the Play export.` });
    doc.slides.forEach((s, i) => {
      const n = i + 1, base = { slideId: s.id, slide: n };
      if (s.device.type !== 'hidden' && !s.shot) add(Object.assign({ sev: 'warn', type: 'shot', msg: `Slide ${n} still shows the “Add a screenshot” placeholder.`, fixLabel: 'Upload', manual: true }, base));
      const plain = String(s.text.headline || '').replace(/\*/g, '').trim();
      if (!plain) add(Object.assign({ sev: 'info', type: 'nohead', msg: `Slide ${n} has no headline. A short line helps people get the point at a glance.` }, base));
      else {
        const words = plain.split(/\s+/).length;
        if (plain.length > 46 || words > 8) add(Object.assign({ sev: 'info', type: 'long', msg: `Slide ${n}’s headline is long (${plain.length} characters, ${words} words). Under 40 characters reads best.` }, base));
        const pt = s.text.size * 0.11;
        if (s.text.size < MIN_SIZE) add(Object.assign({ sev: 'warn', type: 'small', msg: `Slide ${n}’s headline will be about ${pt.toFixed(1)}pt in search results, which is hard to read. Make it bigger.`, fixLabel: 'Make bigger' }, base));
      }
      CHECK_SIZES.forEach((key) => {
        let m;
        try { m = measure(s, key); } catch (e) { console.warn('check', e); return; }
        const size = LABEL[key];
        if (m.lines > 3) add(Object.assign({ sev: 'warn', type: 'lines', key, size, msg: `Slide ${n}’s headline wraps to ${m.lines} lines.`, fixLabel: 'Shrink to fit' }, base));
        if (m.contrast < 3 && !m.overlap) add(Object.assign({ sev: 'warn', type: 'contrast', key, size, msg: `Slide ${n}’s text is hard to read against its background (${m.contrast.toFixed(1)}:1 contrast; aim for at least 4.5:1).`, fixLabel: 'Fix colour' }, base));
        if (m.overlap) add(Object.assign({ sev: 'warn', type: 'overlap', key, size, msg: `Slide ${n}’s headline runs into the phone.`, fixLabel: 'Make room' }, base));
        if (m.offCanvas) add(Object.assign({ sev: 'warn', type: 'offcanvas', key, size, msg: `Slide ${n}’s text is cut off at the edge.`, fixLabel: 'Fit text' }, base));
        if (m.badgeOff.length) add(Object.assign({ sev: 'warn', type: 'badgeOff', key, size, msg: `An element on slide ${n} is outside the image.`, fixLabel: 'Bring it back' }, base));
        if (m.badgeOverText.length) add(Object.assign({ sev: 'warn', type: 'badgeText', key, size, ids: m.badgeOverText, msg: `An element on slide ${n} covers the headline.`, fixLabel: 'Move it' }, base));
      });
    });
    return issues.sort((a, b) => (a.sev === b.sev ? (a.slide || 0) - (b.slide || 0) : a.sev === 'warn' ? -1 : 1));
  };

  function runFix(issue) {
    const E = ED();
    const s = E.doc.slides.find((x) => x.id === issue.slideId);
    if (!s) return false;
    if (issue.type === 'shot') { E.closeModal('checkModal'); E.pickScreenshot(s.id); return false; }
    const f = FIX[issue.type];
    if (!f) return false;
    f(s, issue.key || 'ios69', issue.ids || []);
    E.requestRender(s.id);
    return true;
  }

  let lastIssues = [];
  function updateBadge(issues) {
    const el = $('checkCount');
    if (!el) return;
    const n = issues.filter((x) => x.sev === 'warn').length;
    el.textContent = n ? String(n) : '';
    el.className = n ? 'on' : '';
    const btn = $('checkBtn');
    if (btn) btn.title = n ? `${n} thing${n === 1 ? '' : 's'} to check before exporting` : 'Pre-flight check: all clear';
  }
  let checkTimer = 0;
  function scheduleCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      const run = () => { try { lastIssues = P.preflight(); updateBadge(lastIssues); } catch (e) { console.warn(e); } };
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 }); else run();
    }, 900);
  }

  function renderCheck() {
    const E = ED();
    const el = E.el;
    const body = $('ckBody');
    lastIssues = P.preflight();
    updateBadge(lastIssues);
    body.innerHTML = '';
    const warns = lastIssues.filter((x) => x.sev === 'warn');
    const tips = lastIssues.filter((x) => x.sev !== 'warn');
    const sum = el('div', 'ck-sum ' + (warns.length ? 'warn' : 'ok'));
    sum.innerHTML = warns.length
      ? `${E.ic('warn')}<div><b>${warns.length} thing${warns.length === 1 ? '' : 's'} to fix</b><span>${tips.length ? `plus ${tips.length} tip${tips.length === 1 ? '' : 's'}. ` : ''}Checked on iPhone and Google Play sizes.</span></div>`
      : `${E.ic('check')}<div><b>All clear. Ready to export.</b><span>${tips.length ? `${tips.length} optional tip${tips.length === 1 ? '' : 's'} below.` : 'Text is readable, nothing overlaps and every slide has a screenshot.'}</span></div>`;
    body.append(sum);
    lastIssues.forEach((it) => {
      const row = el('div', 'ck-item ' + it.sev);
      row.append(el('span', 'ck-ic', E.ic(it.sev === 'warn' ? 'warn' : 'info')));
      const txt = el('div', 'ck-txt');
      txt.append(el('p', '', esc(it.msg)));
      if (it.sizes && it.sizes.length) txt.append(el('small', '', 'Seen on: ' + it.sizes.join(', ')));
      row.append(txt);
      const acts = el('div', 'ck-acts');
      if (it.slideId) {
        const go = el('button', 'btn btn-sm', 'Show');
        go.type = 'button';
        go.onclick = () => { const i = E.doc.slides.findIndex((x) => x.id === it.slideId); E.closeModal('checkModal'); if (i >= 0) E.selectSlide(i); };
        acts.append(go);
      }
      if (it.fixLabel) {
        const fx = el('button', 'btn btn-sm btn-primary', esc(it.fixLabel));
        fx.type = 'button';
        fx.dataset.fix = it.type;
        fx.onclick = () => { if (runFix(it)) { E.commit(); E.refreshPanel(); renderCheck(); } };
        acts.append(fx);
      }
      row.append(acts);
      body.append(row);
    });
    const fixable = lastIssues.filter((x) => x.fixLabel && !x.manual);
    $('ckFixAll').disabled = !fixable.length;
    $('ckFixAll').textContent = fixable.length ? `Fix all (${fixable.length})` : 'Fix all';
  }
  function fixAll() {
    const E = ED();
    let changed = false;
    // run fixes in a stable order; re-check between rounds because one fix can affect another
    for (let round = 0; round < 3; round++) {
      const todo = P.preflight().filter((x) => x.fixLabel && !x.manual);
      if (!todo.length) break;
      todo.forEach((it) => { if (runFix(it)) changed = true; });
    }
    if (changed) { E.commit(); E.refreshPanel(); E.toast('Fixed what could be fixed automatically'); }
    renderCheck();
  }
  function openCheck() {
    const E = ED();
    E.flushText();
    renderCheck();
    E.openModal('checkModal');
  }
  function preflightSummary() {
    const E = ED();
    const el = E.el;
    lastIssues = P.preflight();
    updateBadge(lastIssues);
    const warns = lastIssues.filter((x) => x.sev === 'warn').length;
    const box = el('div', 'expf ' + (warns ? 'warn' : 'ok'));
    box.innerHTML = warns ? `${E.ic('warn')}<span><b>${warns} thing${warns === 1 ? '' : 's'} to check</b> before you export.</span>` : `${E.ic('check')}<span><b>Pre-flight check passed.</b> Text is readable and nothing overlaps.</span>`;
    if (warns) {
      const b = el('button', 'btn btn-sm', 'Review');
      b.type = 'button';
      b.onclick = () => { E.closeModal('exportModal'); openCheck(); };
      box.append(b);
    }
    return box;
  }

  /* ═════════════ 1. Store preview ═════════════ */
  const pv = { store: 'apple', view: 'search', mode: 'light', glance: false };
  let shotCache = { apple: [], google: [] };
  function renderShots() {
    const E = ED();
    const out = { apple: [], google: [] };
    [['apple', 'ios69', 440], ['google', 'gpPhone', 360]].forEach(([k, size, w]) => {
      const S = P.SIZES[size];
      const list = k === 'google' ? E.doc.slides.slice(0, 8) : E.doc.slides;
      list.forEach((s) => {
        const c = mk(w, Math.round((w * S.h) / S.w));
        try { P.render(c.getContext('2d'), c.width, c.height, s, { frame: S.frame, getImage: E.getImage }); } catch (e) { console.error(e); }
        out[k].push(c.toDataURL('image/jpeg', 0.9));
      });
    });
    shotCache = out;
  }
  function iconURL() {
    const E = ED();
    const meta = E.doc.meta;
    const img = meta.icon && E.getImage(meta.icon);
    if (img) {
      const c = mk(240, 240);
      const ctx = c.getContext('2d');
      const iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(240 / iw, 240 / ih);
      ctx.drawImage(img, (240 - iw * sc) / 2, (240 - ih * sc) / 2, iw * sc, ih * sc);
      return c.toDataURL('image/png');
    }
    // generated icon from the first slide's colours + initial
    const s = E.doc.slides[0];
    const c = mk(240, 240);
    const ctx = c.getContext('2d');
    const bg = s.bg || {};
    const g = ctx.createLinearGradient(0, 0, 240, 240);
    g.addColorStop(0, bg.type === 'solid' ? bg.color : bg.c1 || bg.color || '#7FA88A');
    g.addColorStop(1, bg.type === 'solid' ? P.mix(bg.color, '#000000', 0.18) : bg.c2 || bg.color || '#4F6E58');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 240, 240);
    const letter = (String(meta.name || 'A').trim()[0] || 'A').toUpperCase();
    const fill = s.text.hl && P.contrast(s.text.hl, bg.c1 || bg.color || '#000') > 2.5 ? s.text.hl : s.text.color;
    ctx.fillStyle = fill;
    ctx.font = P.fontString(s.text.font || 'Geist', 800, 132);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 120, 130);
    return c.toDataURL('image/png');
  }
  const SVG = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0-12-4 4m4-4 4 4M6 11H5v9h14v-9h-1"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  };
  function stars(r, cls) {
    const v = clamp(parseFloat(r) || 0, 0, 5);
    let h = '';
    for (let i = 1; i <= 5; i++) {
      const f = clamp(v - (i - 1), 0, 1);
      h += `<i class="st" style="--f:${Math.round(f * 100)}%"></i>`;
    }
    return `<span class="${cls || 'stars'}">${h}</span>`;
  }
  const status = () => `<div class="pv-status"><b>9:41</b><span><i class="sig"></i><i class="wifi"></i><i class="bat"></i></span></div>`;
  function appleSearch(m, icon, shots) {
    const ghost = `<div class="as-res ghost"><div class="as-row"><div class="as-ic g"></div><div class="as-meta"><i></i><i></i><i></i></div><span class="as-get">Get</span></div><div class="as-shots"><div></div><div></div><div></div></div></div>`;
    return `<div class="as">
      <div class="as-nav"><div class="as-sbar">${SVG.search}<span>${esc(m.name)}</span>${SVG.mic}</div><span class="as-cancel">Cancel</span></div>
      <div class="as-res">
        <div class="as-row"><img class="as-ic" src="${icon}" alt=""><div class="as-meta"><b>${esc(m.name)}</b><span>${esc(m.subtitle)}</span><span class="as-rate">${stars(m.rating)}<em>${esc(m.ratings)}</em></span></div><div class="as-getwrap"><span class="as-get">Get</span><small>In-App Purchases</small></div></div>
        <div class="as-shots">${shots.slice(0, 3).map((u) => `<img src="${u}" alt="">`).join('')}</div>
      </div>${ghost}</div>`;
  }
  function applePage(m, icon, shots) {
    return `<div class="as page">
      <div class="as-back">${SVG.back}<span>Search</span></div>
      <div class="as-head"><img class="as-ic big" src="${icon}" alt=""><div class="as-hmeta"><h3>${esc(m.name)}</h3><p>${esc(m.subtitle)}</p><div class="as-acts"><span class="as-get fill">Get</span><span class="as-share">${SVG.share}</span></div></div></div>
      <div class="as-info">
        <div><small>${esc(m.ratings)} RATINGS</small><b>${esc(m.rating)}</b>${stars(m.rating, 'stars sm')}</div>
        <div><small>AGE</small><b>4+</b><span>Years</span></div>
        <div><small>CATEGORY</small><b class="ico">${SVG.grid}</b><span>${esc((m.category || '').split(' ')[0])}</span></div>
        <div><small>DEVELOPER</small><b class="ico">${SVG.person}</b><span>${esc(m.developer)}</span></div>
      </div>
      <div class="as-shots big">${shots.map((u) => `<img src="${u}" alt="">`).join('')}</div>
      <div class="as-sec"><div class="as-sech"><h4>What’s New</h4><span>Version History</span></div><small>Version 1.0</small><p>Fresh new look, faster sync and a few small fixes.</p></div>
    </div>`;
  }
  function googleSearch(m, icon, shots) {
    const ghost = `<div class="gp-res ghost"><div class="gp-ic g"></div><div class="gp-meta"><i></i><i></i><i></i></div></div>`;
    return `<div class="gp">
      <div class="gp-sbar">${SVG.arrow}<span>${esc(m.name)}</span>${SVG.mic}</div>
      <div class="gp-res"><img class="gp-ic" src="${icon}" alt=""><div class="gp-meta"><b>${esc(m.name)}</b><span>${esc(m.developer)}</span><span>${esc(m.rating)} ★ · ${esc(m.downloads || '100K+')} downloads</span></div></div>
      <div class="gp-install">Install</div>
      <div class="gp-shots">${shots.slice(0, 4).map((u) => `<img src="${u}" alt="">`).join('')}</div>
      ${ghost}${ghost}</div>`;
  }
  function googlePage(m, icon, shots) {
    return `<div class="gp page">
      <div class="gp-top">${SVG.arrow}<span></span>${SVG.search}${SVG.more}</div>
      <div class="gp-head"><img class="gp-ic big" src="${icon}" alt=""><div><h3>${esc(m.name)}</h3><a>${esc(m.developer)}</a><small>In-app purchases</small></div></div>
      <div class="gp-stats"><div><b>${esc(m.rating)} ★</b><span>${esc(m.ratings)} reviews</span></div><div><b>${esc(m.downloads || '100K+')}</b><span>Downloads</span></div><div><b class="esrb">E</b><span>Everyone</span></div></div>
      <div class="gp-install">Install</div>
      <div class="gp-shots big">${shots.map((u) => `<img src="${u}" alt="">`).join('')}</div>
      <div class="gp-sec"><h4>About this app <span>→</span></h4><p>${esc(m.subtitle)}</p><span class="gp-chip">${esc(m.category)}</span></div>
    </div>`;
  }
  /* ───────── thumbnail test: real search-result size, competitors around you, stand-out score ───────── */
  let compCache = null;
  /** Generic "other apps" so you can judge contrast against neighbours. Simple shapes, no real brands. */
  function competitorShots() {
    if (compCache) return compCache;
    const looks = [['#EEF1F6', '#2F3A4A'], ['#1E2430', '#E8ECF2'], ['#FCEBDD', '#5A3A26'], ['#E7F4EC', '#24412F'], ['#F4F4F5', '#27272A'], ['#22262E', '#DADDE3']];
    compCache = looks.map(([bg, fg], k) => {
      const c = mk(150, 326);
      const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 150, 326);
      g.fillStyle = fg; g.globalAlpha = 0.85;
      P.roundRect(g, 22, 26, 106, 11, 5); g.fill();
      P.roundRect(g, 40, 43, 70, 9, 4); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = P.mix(fg, bg, 0.15);
      P.roundRect(g, 30, 82 + (k % 2) * 8, 90, 230, 16); g.fill();
      g.fillStyle = P.mix(bg, fg, 0.12);
      P.roundRect(g, 35, 88 + (k % 2) * 8, 80, 218, 12); g.fill();
      g.fillStyle = P.mix(bg, fg, 0.3);
      for (let r = 0; r < 5; r++) { P.roundRect(g, 42, 112 + r * 30 + (k % 2) * 8, 66, 16, 5); g.fill(); }
      return c.toDataURL('image/jpeg', 0.85);
    });
    return compCache;
  }
  function compIcon(k) {
    const cols = ['#5B7CFA', '#F2994A', '#27AE60', '#9B51E0', '#EB5757', '#2D9CDB'];
    return `<span class="cmp-ic" style="background:${cols[k % cols.length]}"></span>`;
  }

  /** Scores each slide that shows up in search: legibility, contrast, difference from neighbours, stand-out vs page. */
  function scoreSlides(store, mode) {
    const E = ED();
    const key = store === 'apple' ? 'ios69' : 'gpPhone';
    const S = P.SIZES[key];
    const count = store === 'apple' ? 3 : 4;
    const pageBg = mode === 'dark' ? (store === 'apple' ? '#000000' : '#131314') : '#FFFFFF';
    const slides = E.doc.slides.slice(0, count);
    // tiny renders for colour comparisons
    const tw = 24, th = Math.round((24 * S.h) / S.w);
    const vecs = slides.map((s) => {
      const c = mk(tw, th);
      const g = c.getContext('2d', { willReadFrequently: true });
      try { P.render(g, tw, th, s, { frame: S.frame, getImage: E.getImage }); } catch (e) { /* ignore */ }
      const d = g.getImageData(0, 0, tw, th).data;
      // the slide's edges (left, right, top) are what meet the store page around it
      let r = 0, gg = 0, b = 0, n = 0;
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        if (!(x < 3 || x >= tw - 3 || y < 3)) continue;
        const i = (y * tw + x) * 4;
        r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++;
      }
      return { data: d, avg: '#' + [r, gg, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('') };
    });
    const diff = (a, b) => { let t = 0; for (let i = 0; i < a.length; i += 4) t += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return t / (a.length / 4) / 765; };
    const lerp01 = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1);
    return slides.map((s, i) => {
      const hints = [];
      const plain = String(s.text.headline || '').replace(/\*/g, '').trim();
      // 1. legibility: headline size on the phone in points (search thumbnail)
      const pt = s.text.size * (store === 'apple' ? 0.11 : 0.13);
      let legib = plain ? lerp01(pt, 7, 10.5) : 0; // 9.1pt (pre-flight's minimum) ≈ 0.6, the hint threshold
      const words = plain ? plain.split(/\s+/).length : 0;
      if (words > 6) legib *= 0.8;
      if (!plain) hints.push('Add a short headline. Without one, the slide has nothing to read.');
      else if (legib < 0.6) hints.push(`The headline is about ${pt.toFixed(1)}pt here. Make it bigger or shorter.`);
      else if (words > 6) hints.push('Fewer words read faster at this size. Aim for 3–5.');
      // 2. contrast of the headline against its background
      let contrast = 1;
      if (plain) {
        try { const m = measure(s, key); contrast = lerp01(m.contrast, 1.6, 4.5); if (m.overlap) contrast *= 0.6; } catch (e) { /* ignore */ }
        if (contrast < 0.6) hints.push('The headline blends into the background. Try the Check button’s “Fix colour”.');
      }
      // 3. different from neighbouring slides
      let distinct = 1;
      const ds = []; // [difference, neighbour slide number]
      if (i > 0) ds.push([diff(vecs[i].data, vecs[i - 1].data), i]);
      if (i < vecs.length - 1) ds.push([diff(vecs[i].data, vecs[i + 1].data), i + 2]);
      if (ds.length) {
        const closest = ds.reduce((a, b) => (b[0] < a[0] ? b : a));
        distinct = lerp01(closest[0], 0.05, 0.16);
        if (distinct < 0.5) hints.push(`Looks a lot like slide ${closest[1]}. Change the screen, layout or tilt so each slide earns its place.`);
      }
      // 4. stands out from the store page around it
      const standout = lerp01(P.contrast(vecs[i].avg, pageBg), 1.15, 3);
      if (standout < 0.5) hints.push(`Mostly ${mode === 'dark' ? 'dark' : 'white'}, like the store page itself. A coloured background stands out more.`);
      // 5. clutter
      const nb = (s.badges || []).length;
      const clutter = nb > 3 ? 0.75 : 1;
      if (nb > 3) hints.push(`${nb} badges get busy at this size. Keep 1–2.`);
      const score = Math.round((legib * 30 + contrast * 25 + distinct * 25 + standout * 20) * clutter);
      return { n: i + 1, score, label: score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Weak', hints: hints.slice(0, 3), shot: (store === 'apple' ? shotCache.apple : shotCache.google)[i] };
    });
  }

  function appleThumb(m, icon, shots) {
    const comp = competitorShots();
    const other = (k) => `<div class="as-res cmp"><div class="as-row">${compIcon(k)}<div class="as-meta"><i></i><i></i><i class="s"></i></div><span class="as-get">Get</span></div><div class="as-shots">${[0, 1, 2].map((j) => `<img src="${comp[(k * 3 + j) % comp.length]}" alt="">`).join('')}</div></div>`;
    return `<div class="as thumb">
      <div class="as-nav"><div class="as-sbar">${SVG.search}<span>${esc((m.category || 'apps').toLowerCase())}</span>${SVG.mic}</div><span class="as-cancel">Cancel</span></div>
      ${other(0)}
      <div class="as-res you"><div class="as-row"><img class="as-ic" src="${icon}" alt=""><div class="as-meta"><b>${esc(m.name)}</b><span>${esc(m.subtitle)}</span><span class="as-rate">${stars(m.rating)}<em>${esc(m.ratings)}</em></span></div><span class="as-get">Get</span></div>
        <div class="as-shots">${shots.slice(0, 3).map((u) => `<img src="${u}" alt="">`).join('')}</div></div>
      ${other(1)}</div>`;
  }
  function googleThumb(m, icon, shots) {
    const comp = competitorShots();
    const other = (k) => `<div class="gp-blk cmp"><div class="gp-res">${compIcon(k + 2)}<div class="gp-meta"><i></i><i></i><i class="s"></i></div></div><div class="gp-shots">${[0, 1, 2, 3].map((j) => `<img src="${comp[(k * 2 + j) % comp.length]}" alt="">`).join('')}</div></div>`;
    return `<div class="gp thumb">
      <div class="gp-sbar">${SVG.arrow}<span>${esc((m.category || 'apps').toLowerCase())}</span>${SVG.mic}</div>
      ${other(0)}
      <div class="gp-blk you"><div class="gp-res"><img class="gp-ic" src="${icon}" alt=""><div class="gp-meta"><b>${esc(m.name)}</b><span>${esc(m.developer)}</span><span>${esc(m.rating)} ★</span></div></div>
        <div class="gp-shots">${shots.slice(0, 4).map((u) => `<img src="${u}" alt="">`).join('')}</div></div>
      ${other(1)}</div>`;
  }
  function thumbPanel() {
    const scores = scoreSlides(pv.store, pv.mode);
    const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;
    const tone = (v) => (v >= 80 ? 'hi' : v >= 60 ? 'mid' : 'lo');
    return `<div class="th-side">
      <div class="th-total ${tone(avg)}"><b>${avg}</b><div><span>Stand-out score</span><small>${pv.store === 'apple' ? 'First 3 slides, App Store search' : 'First 4 slides, Google Play search'} · ${pv.mode}</small></div></div>
      ${scores.map((s) => `<div class="th-row ${tone(s.score)}" data-slide="${s.n}"><img src="${s.shot || ''}" alt=""><div class="th-info"><div class="th-top"><b>Slide ${s.n}</b><span class="th-sc">${s.score} · ${s.label}</span></div><div class="th-bar"><i style="width:${s.score}%"></i></div>${s.hints.length ? `<ul>${s.hints.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : '<p>Reads well and stands out at this size.</p>'}</div></div>`).join('')}
      <p class="th-note">Scored on headline size, contrast, how different each slide looks from its neighbours, and how much it stands out from the page. Switch Light and Dark: results change.</p>
    </div>`;
  }

  function renderPhone() {
    const E = ED();
    const m = E.doc.meta;
    const stage = $('pvStage');
    if (!stage) return;
    const icon = iconURL();
    if (pv.view === 'thumb') {
      const shotsT = pv.store === 'apple' ? shotCache.apple : shotCache.google;
      const innerT = (pv.store === 'apple' ? appleThumb : googleThumb)(m, icon, shotsT);
      stage.innerHTML = `<div class="th-bar-top"><button type="button" class="btn btn-sm ${pv.glance ? 'on' : ''}" id="pvGlance" aria-pressed="${pv.glance ? 'true' : 'false'}">${pv.glance ? 'Quick glance: on' : 'Quick glance'}</button><span>Blurs things a little, like a fast scroll.</span></div>
        <div class="th-wrap"><div class="pv-phone ${pv.mode} ${pv.store} ${pv.glance ? 'glance' : ''}"><div class="pv-island"></div><div class="pv-screen">${status()}${innerT}</div></div>${thumbPanel()}</div>`;
      $('pvGlance').onclick = () => { pv.glance = !pv.glance; renderPhone(); };
      stage.querySelectorAll('.th-row').forEach((r) => {
        r.onclick = () => { E.closeModal('previewModal'); E.selectSlide(+r.dataset.slide - 1); };
        r.title = 'Go to this slide';
      });
      return;
    }
    const shots = pv.store === 'apple' ? shotCache.apple : shotCache.google;
    const inner = pv.store === 'apple' ? (pv.view === 'search' ? appleSearch : applePage)(m, icon, shots) : (pv.view === 'search' ? googleSearch : googlePage)(m, icon, shots);
    stage.innerHTML = `<div class="pv-phone ${pv.mode} ${pv.store}"><div class="pv-island"></div><div class="pv-screen">${status()}${inner}</div></div>
      <p class="pv-cap">${pv.view === 'search' ? (pv.store === 'apple' ? 'Most people decide from this row. Only your first 3 screenshots show here.' : 'Top results show your first screenshots in a row like this.') : 'Swipe the screenshots sideways, just like on a real phone.'}</p>`;
  }
  function seg(E, label, opts, get, set) {
    const el = E.el;
    const f = el('div', 'field');
    f.append(el('div', 'lab', `<span>${label}</span>`));
    const s = el('div', 'seg');
    opts.forEach(([v, t]) => {
      const b = el('button', get() === v ? 'on' : '', t);
      b.type = 'button';
      b.dataset.v = v;
      b.onclick = () => { set(v); s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); renderPhone(); };
      s.append(b);
    });
    f.append(s);
    return f;
  }
  let metaTimer = 0;
  function metaInput(E, label, key, ph) {
    const el = E.el;
    const f = el('div', 'field');
    f.append(el('div', 'lab', `<span>${label}</span>`));
    const i = el('input', 'inp');
    i.type = 'text';
    i.value = E.doc.meta[key] || '';
    i.placeholder = ph || '';
    i.dataset.meta = key;
    i.addEventListener('input', () => {
      E.doc.meta[key] = i.value;
      clearTimeout(metaTimer);
      metaTimer = setTimeout(() => { renderPhone(); E.save(); }, 120);
    });
    f.append(i);
    return f;
  }
  let openPreview = function () {
    const E = ED();
    E.flushText();
    const el = E.el;
    const body = $('pvBody');
    body.innerHTML = '';
    const side = el('div', 'pv-side');
    side.append(seg(E, 'Store', [['apple', 'App Store'], ['google', 'Google Play']], () => pv.store, (v) => { pv.store = v; }));
    side.append(seg(E, 'Page', [['search', 'Search'], ['page', 'App page'], ['thumb', 'Thumbnail test']], () => pv.view, (v) => { pv.view = v; }));
    side.append(seg(E, 'Appearance', [['light', 'Light'], ['dark', 'Dark']], () => pv.mode, (v) => { pv.mode = v; }));
    side.append(el('h3', '', 'Your app'));
    side.append(metaInput(E, 'App name', 'name', 'My App'));
    side.append(metaInput(E, 'Subtitle', 'subtitle', 'What it does, in a few words'));
    side.append(metaInput(E, 'Developer', 'developer', 'Your name or studio'));
    const r = el('div', 'row2');
    r.append(metaInput(E, 'Rating', 'rating', '4.8'), metaInput(E, 'Ratings', 'ratings', '12K'));
    side.append(r);
    const r2 = el('div', 'row2');
    r2.append(metaInput(E, 'Category', 'category', 'Productivity'), metaInput(E, 'Downloads', 'downloads', '100K+'));
    side.append(r2);
    // icon
    const ic = el('div', 'field');
    ic.append(el('div', 'lab', '<span>App icon</span>'));
    const row = el('div', 'pv-icon');
    const prev = el('img');
    prev.alt = '';
    prev.src = iconURL();
    const up = el('button', 'btn btn-sm', E.doc.meta.icon ? 'Replace' : 'Upload icon');
    up.type = 'button';
    const fi = el('input');
    fi.type = 'file';
    fi.accept = 'image/*';
    fi.hidden = true;
    up.onclick = () => { fi.value = ''; fi.click(); };
    fi.onchange = async () => {
      const f = fi.files && fi.files[0];
      if (!f) return;
      try { E.doc.meta.icon = await E.addAsset(f); E.save(); openPreview(); } catch (e) { E.toast('That image couldn’t be opened.'); }
    };
    row.append(prev, up, fi);
    if (E.doc.meta.icon) {
      const rm = el('button', 'btn btn-sm', 'Remove');
      rm.type = 'button';
      rm.onclick = () => { E.doc.meta.icon = null; E.save(); openPreview(); };
      row.append(rm);
    }
    ic.append(row);
    if (!E.doc.meta.icon) ic.append(el('small', 'pv-hint', 'No icon yet, so we made one from your colours.'));
    side.append(ic);
    side.append(el('p', 'pv-legal', 'Approximate layouts for previewing only. Not affiliated with Apple or Google.'));
    const stage = el('div', 'pv-stage');
    stage.id = 'pvStage';
    body.append(side, stage);
    renderShots();
    renderPhone();
    E.openModal('previewModal');
  };

  // make sure the app-details record exists (older saved projects don't have it)
  const ensureMeta = () => { const d = ED().doc; d.meta = Object.assign({ name: 'My App', subtitle: '', developer: '', rating: '4.8', ratings: '12K', category: '', downloads: '100K+', icon: null }, d.meta || {}); };
  const _openPreview = openPreview;
  openPreview = function () { ensureMeta(); _openPreview(); };

  P.extras = { colourCard, preflightSummary, openCheck, openPreview, scheduleCheck, fixAll, renderCheck };
  document.addEventListener('DOMContentLoaded', () => {
    const fa = $('ckFixAll'), rc = $('ckRecheck');
    if (fa) fa.onclick = fixAll;
    if (rc) rc.onclick = renderCheck;
  });
})();
