/* Paneful themes + slide model.
 * A theme = a layout style (archetype) + a font pairing + 3 colourways, with sample element copy for its category.
 * Applying a theme keeps each slide's words and screenshot; everything stays editable afterwards. */
(function () {
  'use strict';
  const P = (window.Paneful = window.Paneful || {});
  const clone = (o) => JSON.parse(JSON.stringify(o));
  P.clone = clone;
  P.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* where text and device sit, as fractions of the reference box */
  P.LAYOUTS = {
    top:    { label: 'Text on top',    text: { y: 0.07 }, device: { y: 0.335, x: 0.5 } },
    bottom: { label: 'Text at bottom', text: { y: 0.795 }, device: { y: 0.055, x: 0.5 } },
  };

  P.defaultSlide = function () {
    return {
      id: P.uid(),
      shot: null,
      layout: 'top',
      bg: { type: 'solid', color: '#F4F4F2', c1: '#F4F4F2', c2: '#DADAD6', angle: 180, image: null, blur: 0, dim: 0, glows: [], glowStrength: 1, glowColor: null, pattern: 'none', patternColor: '#FFFFFF', patternAlpha: 0.1, grain: 0 },
      text: {
        headline: 'Your *headline* here', sub: 'One short line about this screen',
        font: 'Geist', weight: 700, size: 100, lh: 1.04, ls: 0, upper: false, color: '#0B0B0C',
        hl: '#7FA88A', hlFont: null, hlWeight: 400, hlItalic: false, hlScale: 1, hlColorize: true,
        subFont: 'Geist', subWeight: 500, subSize: 44, subColor: '#5E5E66',
        align: 'center', y: 0.07, width: 0.86,
      },
      device: { type: 'auto', color: 'black', x: 0.5, y: 0.335, scale: 0.74, rot: 0, tiltX: 0, tiltY: 0, shadow: 0.5, corner: 0.06 },
      badges: [],
      ui: P.defaultUI ? P.defaultUI() : { font: 'Geist', chipBg: '#FFFFFF', chipText: '#16161A', star: '#FFC83D', card: 'rgba(255,255,255,0.12)', accent: '#7FA88A' },
    };
  };

  /** Places text + device for a layout preset. */
  P.applyLayout = function (slide, layoutKey) {
    const L = P.LAYOUTS[layoutKey] || P.LAYOUTS.top;
    slide.layout = layoutKey in P.LAYOUTS ? layoutKey : 'top';
    Object.assign(slide.text, L.text);
    Object.assign(slide.device, L.device);
  };

  /* ───────── categories + sample element copy ───────── */
  P.CATEGORIES = [
    ['ai', 'AI & Assistants'], ['social', 'Social & Chat'], ['video', 'Video & Streaming'], ['music', 'Music & Audio'],
    ['shopping', 'Shopping'], ['travel', 'Travel & Maps'], ['education', 'Education'], ['productivity', 'Productivity'],
    ['health', 'Health & Fitness'], ['finance', 'Finance'], ['food', 'Food & Drink'], ['games', 'Games'],
  ];
  const COPY = {
    ai:           { chips: ['Instant answers', 'Writes for you', 'Voice mode', 'Summarise anything', 'Works in 40 languages', 'Private by default'], bubbles: ['Plan my week for me', 'Done! Here’s your plan'], stat: ['10×', 'faster drafts'], rating: ['4.9 rating', '25K reviews'], award: ['App of the Day', 'App Store'], review: ['Like a genius in my pocket', '“It drafts my emails, plans my trips and never gets tired of my questions.”', 'Arjun, Bengaluru'] },
    social:       { chips: ['Group chats', 'Voice notes', 'Stories', 'Disappearing messages', 'Close friends', 'Reactions'], bubbles: ['Are we still on for tonight?', 'Yes! See you at 8 🎉'], stat: ['5M+', 'friends connected'], rating: ['4.8 rating', '40K reviews'], award: ['Editors’ Choice', 'App Store'], review: ['Finally, chats that feel calm', '“All my friends are here and it never feels noisy.”', 'Meera, Pune'] },
    video:        { chips: ['4K HDR', 'Download & go', 'New every Friday', 'No ads', 'Watch together', 'Kids profiles'], bubbles: ['What should we watch?', 'Starting the next episode…'], stat: ['10K+', 'titles to stream'], rating: ['4.8 rating', '60K reviews'], award: ['Best of 2026', 'App Store'], review: ['My weekend plans, sorted', '“The recommendations are scary good. I found three new favourite shows.”', 'Kabir, Mumbai'] },
    music:        { chips: ['Lossless audio', 'Offline mode', 'Daily mixes', 'Lyrics', 'Spatial sound', 'Sleep timer'], bubbles: ['Play something calm', 'Queued: Evening Focus'], stat: ['80M', 'songs'], rating: ['4.9 rating', '30K reviews'], award: ['App of the Day', 'App Store'], review: ['The best-sounding app I own', '“Every mix feels like it was made just for me.”', 'Ananya, Delhi'] },
    shopping:     { chips: ['Free delivery', 'Easy returns', 'Price drop alerts', 'New arrivals', 'Pay later', 'Gift wrap'], bubbles: ['Is this back in stock?', 'Yes, and 20% off today!'], stat: ['−40%', 'on weekend deals'], rating: ['4.8 rating', '50K reviews'], award: ['Editors’ Choice', 'App Store'], review: ['Shopping that feels effortless', '“Delivery was fast and returns were even easier.”', 'Riya, Hyderabad'] },
    travel:       { chips: ['Offline maps', 'Live delays', 'Hidden gems', 'Trip planner', 'Price alerts', 'Local tips'], bubbles: ['Best café near me?', '3 spots, 5 min walk'], stat: ['190', 'countries covered'], rating: ['4.9 rating', '18K reviews'], award: ['App of the Day', 'App Store'], review: ['My favourite travel buddy', '“Planned a whole Goa trip in ten minutes, with a budget.”', 'Dev, Chennai'] },
    education:    { chips: ['5 minutes a day', 'Streaks', 'Bite-size lessons', 'Practice quizzes', 'Offline', 'Certificates'], bubbles: ['How do I say “thank you”?', 'Great job! +20 XP'], stat: ['12M', 'learners'], rating: ['4.8 rating', '70K reviews'], award: ['Editors’ Choice', 'App Store'], review: ['Learning finally stuck', '“Short lessons I actually finish. I’m on a 90-day streak.”', 'Sana, Kolkata'] },
    productivity: { chips: ['Focus mode', 'Smart reminders', 'Calendar sync', 'Works offline', 'Shared lists', 'Widgets'], bubbles: ['Move my 3pm to tomorrow', 'Done. Your afternoon is free.'], stat: ['2h', 'saved every week'], rating: ['4.9 rating', '22K reviews'], award: ['App of the Day', 'App Store'], review: ['My calmest workday yet', '“Everything in one place, and it actually stays tidy.”', 'Rahul, Jaipur'] },
    health:       { chips: ['Daily streaks', 'Sleep tracking', 'Guided workouts', 'Mood check-ins', 'Water reminders', 'Apple Health'], bubbles: ['How did I sleep?', '7h 42m · Best this week'], stat: ['86%', 'goals hit this week'], rating: ['4.9 rating', '35K reviews'], award: ['Editors’ Choice', 'App Store'], review: ['Healthy habits, finally', '“Gentle nudges, no guilt. I’ve never been this consistent.”', 'Isha, Ahmedabad'] },
    finance:      { chips: ['Bank-grade security', 'Instant transfers', 'Smart budgets', 'No hidden fees', 'Spending insights', 'Bill reminders'], bubbles: ['Can I afford a weekend trip?', 'Yes, ₹12,400 to spare'], stat: ['₹8.2K', 'saved per month'], rating: ['4.8 rating', '45K reviews'], award: ['App of the Day', 'App Store'], review: ['Money finally makes sense', '“I can see exactly where every rupee goes.”', 'Vikram, Gurugram'] },
    food:         { chips: ['Ready in 20 min', '1,000+ recipes', 'Veg friendly', 'Grocery lists', 'Step-by-step', 'Meal plans'], bubbles: ['What can I cook tonight?', 'Paneer tikka, 25 min'], stat: ['4.5K', 'recipes'], rating: ['4.9 rating', '28K reviews'], award: ['Editors’ Choice', 'App Store'], review: ['Dinner is sorted', '“The weekly meal plan saves me so much time and money.”', 'Neha, Lucknow'] },
    games:        { chips: ['Play offline', 'Daily challenges', 'Leaderboards', 'No pay-to-win', 'New levels weekly', 'Play with friends'], bubbles: ['Rematch?', 'You’re on! 🔥'], stat: ['500+', 'levels'], rating: ['4.8 rating', '90K reviews'], award: ['Game of the Day', 'App Store'], review: ['Seriously addictive', '“Perfect for a quick break. I keep coming back every day.”', 'Aman, Indore'] },
  };
  P.CATEGORY_COPY = COPY;

  /* ───────── colour palettes: [background, background 2, accent] ───────── */
  const PAL = {
    violet: ['#0E0826', '#2B1166', '#B79CFF'], indigo: ['#0B1030', '#1F2C6E', '#8FB3FF'], midnight: ['#0A0F1F', '#18243F', '#7FD1FF'],
    ember: ['#1A0A05', '#4A1A0A', '#FF8A3D'], crimson: ['#1A0508', '#4A0F1A', '#FF5A6E'], forest: ['#0B1A12', '#1E3A2D', '#9BD3A8'],
    teal: ['#04191C', '#0F4049', '#5FE0D0'], graphite: ['#111214', '#2A2C31', '#7FA88A'], noir: ['#0A0A0A', '#1C1C1C', '#E9E6DF'],
    plum: ['#1A0820', '#43154F', '#F49BFF'], ocean: ['#041A2E', '#0D4A6E', '#6FD3FF'], gold: ['#14100A', '#3A2C12', '#E8C26A'],
    magenta: ['#1F0518', '#5A0F45', '#FF6EC7'], cobalt: ['#050B2E', '#1235A8', '#7FA6FF'], nightgreen: ['#07140E', '#123A28', '#6CF0A8'],
    paper: ['#F3EDE2', '#E6DCCB', '#B4532A'], cream: ['#FBF6EC', '#F1E6D0', '#C96F1F'], sky: ['#EAF4FF', '#C9E2FF', '#2F6FEB'],
    mint: ['#ECF8F1', '#CDEEDB', '#1F8A5B'], blush: ['#FFF0F3', '#FFD3DD', '#D93D74'], lavender: ['#F4F0FF', '#DCCFFF', '#6C4FE0'],
    lemon: ['#FFF8D6', '#FFE98A', '#D9541A'], sand: ['#F5EFE6', '#E8DCC8', '#7A5A32'], snow: ['#FFFFFF', '#EFEFF2', '#111114'],
    peach: ['#FFE9DC', '#FFC6A8', '#D2491F'],
    yellow: ['#FFD60A', '#FFC300', '#111111'], coral: ['#FF6F61', '#FFA07A', '#FFFFFF'], lime: ['#C6F432', '#9EDC1A', '#111111'],
    electric: ['#3A2BFF', '#7A5CFF', '#FFE14D'], tangerine: ['#FF7A1A', '#FFB347', '#1A0A00'], pink: ['#FF4F9A', '#FF9A3C', '#2B0A3D'],
    aqua: ['#00B8C2', '#4FE3C1', '#062A2B'], red: ['#E63946', '#FF7B6B', '#FFF3E0'], grape: ['#6A2CF0', '#B07BFF', '#FFE14D'],
  };
  P.PALETTES = PAL;

  /** Turns a 3-colour palette into every colour a slide needs, picking readable text automatically. */
  function derive(pl) {
    const [bg1, bg2, accent] = pl;
    const avg = P.mix(bg1, bg2, 0.5);
    const dark = P.contrast('#FFFFFF', avg) >= P.contrast('#111114', avg);
    const text = dark ? '#FFFFFF' : '#111114';
    const sub = P.mix(text, avg, dark ? 0.3 : 0.36);
    const lum = P.luminance(bg1);
    return {
      bg1, bg2, accent, dark, text, sub,
      hl: P.contrast(accent, avg) >= 2.2 ? accent : text,
      chipBg: lum > 0.88 ? '#16161A' : '#FFFFFF',
      chipText: lum > 0.88 ? '#FFFFFF' : '#16161A',
      card: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
      frame: dark ? 'black' : 'silver',
    };
  }
  P.derivePalette = (name) => derive(PAL[name]);

  /* ───────── font pairings ───────── */
  const FP = [
    { font: 'Geist', weight: 700, size: 100, lh: 1.02, ls: -0.03, hlFont: 'Instrument Serif', hlItalic: true, hlScale: 1.12, body: 'Geist' },
    { font: 'Inter', weight: 800, size: 96, lh: 1.03, ls: -0.035, hlFont: 'Instrument Serif', hlItalic: true, hlScale: 1.14, body: 'Inter' },
    { font: 'Manrope', weight: 800, size: 96, lh: 1.04, ls: -0.02, hlFont: 'Fraunces', hlItalic: true, hlWeight: 500, hlScale: 1.04, body: 'Manrope' },
    { font: 'Sora', weight: 700, size: 90, lh: 1.06, ls: -0.02, hlFont: 'Playfair Display', hlItalic: true, hlWeight: 500, hlScale: 1.08, body: 'Sora' },
    { font: 'Outfit', weight: 700, size: 100, lh: 1.03, ls: -0.02, hlFont: 'Instrument Serif', hlItalic: true, hlScale: 1.1, body: 'Outfit' },
    { font: 'Bricolage Grotesque', weight: 800, size: 100, lh: 1.0, ls: -0.03, body: 'Bricolage Grotesque' },
    { font: 'Space Grotesk', weight: 700, size: 94, lh: 1.04, ls: -0.02, body: 'Space Grotesk' },
    { font: 'Instrument Serif', weight: 400, size: 118, lh: 0.98, ls: -0.01, hlFont: 'Instrument Serif', hlItalic: true, hlScale: 1, body: 'DM Sans' },
    { font: 'Fraunces', weight: 600, size: 98, lh: 1.02, ls: -0.02, hlFont: 'Fraunces', hlItalic: true, hlWeight: 500, hlScale: 1, body: 'DM Sans' },
    { font: 'Archivo Black', weight: 400, size: 90, lh: 1.0, ls: 0, upper: true, body: 'DM Sans' },
    { font: 'Nunito', weight: 900, size: 98, lh: 1.04, ls: -0.01, body: 'Nunito' },
    { font: 'DM Serif Display', weight: 400, size: 104, lh: 1.0, ls: -0.01, hlFont: 'DM Serif Display', hlItalic: true, hlScale: 1, body: 'DM Sans' },
  ];

  /* ───────── layout styles (archetypes) ───────── */
  let bid = 0;
  const B = (kind, x, y, o) => Object.assign({ id: 'b' + (++bid).toString(36) + P.uid().slice(0, 4), kind, x, y, size: 42, rot: 0 }, o);
  // vertical position next to the phone: t = 0 (top of phone) … 1 (bottom of the slide)
  const ny = (layout, t) => (layout === 'top' ? 0.38 + t * 0.52 : 0.09 + t * 0.6);
  const glowsFor = (p, layout, i) => [
    { x: 0.5, y: layout === 'top' ? 0.64 : 0.36, r: 0.5, color: p.accent, a: p.dark ? 0.5 : 0.35 },
    { x: i % 2 ? 0.08 : 0.92, y: layout === 'top' ? 0.08 : 0.92, r: 0.42, color: p.bg2, a: 0.8 },
  ];
  const chip = (c, k, x, y, o) => B('chip', x, y, Object.assign({ text: c.chips[k % c.chips.length], icon: 'spark' }, o));

  const ARCH = {
    glow(p, i, c) {
      const layout = i % 2 ? 'bottom' : 'top';
      const badges = i % 3 === 0
        ? [chip(c, i, 0.21, ny(layout, 0.22), { rot: -4 }), chip(c, i + 1, 0.79, ny(layout, 0.52), { rot: 3, icon: 'dot' }), B('sparkle', 0.87, ny(layout, 0.05), { size: 38 })]
        : i % 3 === 1
          ? [B('bubble', 0.27, ny(layout, 0.25), { text: c.bubbles[0], tail: 'left', rot: -2 }), B('bubble', 0.72, ny(layout, 0.48), { text: c.bubbles[1], tail: 'right', rot: 2 })]
          : [B('stat', 0.8, ny(layout, 0.35), { text: c.stat[0], sub: c.stat[1], rot: 4 }), B('sparkle', 0.15, ny(layout, 0.1), { size: 34 })];
      return { layout, bg: { type: 'linear', angle: 165, glows: glowsFor(p, layout, i), grain: 0.6 }, device: { shadow: 0.75 }, badges };
    },
    aurora(p, i, c) {
      const sh = (i % 3) * 0.18;
      return {
        layout: 'top',
        bg: { type: 'radial', c1: P.mix(p.bg2, p.accent, 0.18), c2: p.bg1, grain: 0.5,
          glows: [{ x: 0.15 + sh, y: 0.2, r: 0.45, color: p.accent, a: p.dark ? 0.42 : 0.3 }, { x: 0.9 - sh, y: 0.55, r: 0.5, color: p.bg2, a: 0.9 }, { x: 0.4, y: 0.95, r: 0.4, color: p.accent, a: 0.25 }] },
        device: { shadow: 0.7 },
        badges: [chip(c, i + 2, 0.5, 0.338, { icon: i % 2 ? 'dot' : 'spark' })],
      };
    },
    editorial(p, i, c) {
      const layout = i % 2 ? 'bottom' : 'top';
      const badges = i === 0 ? [B('rating', 0.5, layout === 'top' ? 0.268 : 0.735, { text: c.rating[0], sub: c.rating[1], size: 40 })] : [];
      return { layout, bg: { type: 'solid', grain: 0.25 }, device: { color: p.dark ? 'black' : 'sand', shadow: 0.35 }, badges };
    },
    poster(p, i, c) {
      const layout = 'top';
      return {
        layout,
        bg: { type: 'solid', pattern: 'dots', patternColor: p.text, patternAlpha: 0.08 },
        device: { rot: i % 2 ? 5 : -5, scale: 0.72, shadow: 0.45, color: 'black' },
        badges: [chip(c, i, i % 2 ? 0.24 : 0.76, ny(layout, 0.12), { rot: i % 2 ? -9 : 9, icon: 'star', size: 44 }), B('sparkle', i % 2 ? 0.86 : 0.14, ny(layout, 0.42), { size: 40 })],
      };
    },
    split(p, i, c) {
      const layout = 'top';
      return {
        layout,
        bg: { type: 'split', angle: i % 2 ? 205 : 155, grain: 0.3 },
        device: { shadow: 0.6 },
        badges: [chip(c, i, 0.22, ny(layout, 0.3), { rot: -3, icon: 'dot' }), chip(c, i + 3, 0.78, ny(layout, 0.6), { rot: 3 })],
      };
    },
    tilt(p, i, c) {
      const left = i % 2 === 0;
      return {
        layout: 'top',
        bg: { type: 'linear', angle: 180, glows: [{ x: left ? 0.35 : 0.65, y: 0.62, r: 0.45, color: p.accent, a: 0.45 }], grain: 0.5 },
        device: { tiltX: 8, tiltY: left ? -20 : 20, scale: 0.7, x: left ? 0.46 : 0.54, shadow: 0.85 },
        badges: [B('stat', left ? 0.8 : 0.2, ny('top', 0.3), { text: c.stat[0], sub: c.stat[1] }), chip(c, i + 1, left ? 0.74 : 0.26, ny('top', 0.62), { icon: 'dot' })],
      };
    },
    chat(p, i, c) {
      const layout = i % 2 ? 'bottom' : 'top';
      return {
        layout,
        bg: { type: 'linear', angle: 180, grain: 0.15 },
        device: { shadow: 0.35 },
        badges: [B('bubble', 0.3, ny(layout, 0.2), { text: c.bubbles[0], tail: 'left', size: 40 }), B('bubble', 0.7, ny(layout, 0.4), { text: c.bubbles[1], tail: 'right', size: 40 }), chip(c, i, 0.26, ny(layout, 0.66), { icon: 'dot', size: 38 })],
      };
    },
    proof(p, i, c) {
      const layout = 'top';
      let badges;
      if (i === 0) badges = [B('laurel', 0.5, 0.282, { text: c.award[0], sub: c.award[1], size: 44 })];
      else if (i === 1) badges = [B('review', 0.5, ny(layout, 0.5), { text: c.review[0], sub: c.review[1], author: c.review[2], size: 44, rot: -2 })];
      else if (i === 2) badges = [B('rating', 0.5, 0.278, { text: c.rating[0], sub: c.rating[1], size: 40 })];
      else badges = [chip(c, i, 0.24, ny(layout, 0.3), { icon: 'star', rot: -3 })];
      return { layout, bg: { type: 'linear', angle: 170, glows: [{ x: 0.5, y: 0.2, r: 0.5, color: p.accent, a: p.dark ? 0.3 : 0.25 }], grain: 0.35 }, device: { shadow: 0.6 }, badges };
    },
    minimal(p) {
      return { layout: 'top', textScale: 0.86, bg: { type: 'solid' }, device: { scale: 0.78, shadow: 0.3, y: 0.31 }, badges: [] };
    },
    pattern(p, i, c) {
      const layout = i % 2 ? 'bottom' : 'top';
      return {
        layout,
        bg: { type: 'solid', pattern: i % 3 === 2 ? 'dots' : 'grid', patternColor: p.text, patternAlpha: p.dark ? 0.07 : 0.06 },
        device: { shadow: 0.45 },
        badges: [chip(c, i, 0.22, ny(layout, 0.28), { icon: 'dot', rot: -2 }), chip(c, i + 2, 0.78, ny(layout, 0.55), { icon: 'spark', rot: 2 })],
      };
    },
    sunrise(p, i) {
      return {
        layout: 'top',
        bg: { type: 'linear', angle: 180, glows: [{ x: 0.5, y: 0.0, r: 0.62, color: p.accent, a: p.dark ? 0.55 : 0.4 }], grain: 0.45 },
        device: { shadow: 0.65 },
        badges: [B('sparkle', 0.15, 0.36, { size: 34 }), B('sparkle', 0.86, 0.5 + (i % 2) * 0.12, { size: 28 })],
      };
    },
    bare(p, i, c) {
      return {
        layout: 'top',
        bg: { type: 'linear', angle: 160, glows: glowsFor(p, 'top', i), grain: 0.55 },
        device: { type: 'none', corner: 0.07, scale: 0.7, shadow: 0.8 },
        badges: [chip(c, i, i % 2 ? 0.25 : 0.75, ny('top', 0.18), { rot: i % 2 ? -4 : 4 })],
      };
    },
  };
  P.ARCHETYPES = Object.keys(ARCH);

  /* ───────── the themes: [id, name, category, style, fonts, accent mode, 3 colourways] ─────────
   * accent mode for *starred* words: 'font' = italic serif, 'color' = accent colour, 'both' */
  const ROWS = [
    ['nova', 'Nova', 'ai', 'glow', 0, 'font', ['violet', 'cobalt', 'ember']],
    ['synapse', 'Synapse', 'ai', 'aurora', 2, 'both', ['teal', 'plum', 'indigo']],
    ['oracle', 'Oracle', 'ai', 'tilt', 1, 'font', ['noir', 'violet', 'nightgreen']],
    ['prism', 'Prism', 'ai', 'split', 4, 'font', ['electric', 'grape', 'aqua']],
    ['lumen', 'Lumen', 'ai', 'bare', 3, 'both', ['midnight', 'magenta', 'gold']],
    ['chatter', 'Chatter', 'social', 'chat', 10, 'color', ['sky', 'blush', 'mint']],
    ['circle', 'Circle', 'social', 'glow', 5, 'color', ['magenta', 'cobalt', 'forest']],
    ['pulse', 'Pulse', 'social', 'poster', 9, 'color', ['pink', 'lime', 'yellow']],
    ['echo', 'Echo', 'social', 'proof', 1, 'font', ['lavender', 'peach', 'snow']],
    ['marquee', 'Marquee', 'video', 'tilt', 3, 'both', ['crimson', 'noir', 'ocean']],
    ['premiere', 'Premiere', 'video', 'glow', 8, 'font', ['gold', 'crimson', 'violet']],
    ['spotlight', 'Spotlight', 'video', 'sunrise', 0, 'font', ['ember', 'cobalt', 'plum']],
    ['reel', 'Reel', 'video', 'poster', 9, 'color', ['red', 'tangerine', 'electric']],
    ['binge', 'Binge', 'video', 'aurora', 4, 'font', ['magenta', 'teal', 'indigo']],
    ['vinyl', 'Vinyl', 'music', 'editorial', 7, 'color', ['paper', 'cream', 'sand']],
    ['bassline', 'Bassline', 'music', 'glow', 6, 'color', ['nightgreen', 'magenta', 'cobalt']],
    ['tempo', 'Tempo', 'music', 'split', 5, 'color', ['coral', 'aqua', 'grape']],
    ['lullaby', 'Lullaby', 'music', 'aurora', 2, 'font', ['plum', 'ocean', 'midnight']],
    ['boutique', 'Boutique', 'shopping', 'editorial', 8, 'both', ['blush', 'sand', 'cream']],
    ['cart', 'Cart', 'shopping', 'pattern', 6, 'color', ['lemon', 'mint', 'sky']],
    ['haul', 'Haul', 'shopping', 'poster', 9, 'color', ['tangerine', 'pink', 'lime']],
    ['luxe', 'Luxe', 'shopping', 'minimal', 11, 'font', ['gold', 'noir', 'sand']],
    ['market', 'Market', 'shopping', 'chat', 10, 'color', ['peach', 'mint', 'lavender']],
    ['wander', 'Wander', 'travel', 'sunrise', 3, 'both', ['ocean', 'ember', 'teal']],
    ['atlas', 'Atlas', 'travel', 'editorial', 7, 'color', ['sand', 'sky', 'paper']],
    ['coastline', 'Coastline', 'travel', 'split', 4, 'font', ['aqua', 'coral', 'electric']],
    ['compass', 'Compass', 'travel', 'proof', 0, 'font', ['forest', 'midnight', 'plum']],
    ['scholar', 'Scholar', 'education', 'editorial', 8, 'both', ['cream', 'sky', 'lavender']],
    ['quizzy', 'Quizzy', 'education', 'chat', 10, 'color', ['lemon', 'lavender', 'mint']],
    ['chalk', 'Chalk', 'education', 'pattern', 6, 'color', ['forest', 'graphite', 'indigo']],
    ['lessons', 'Lessons', 'education', 'glow', 1, 'font', ['indigo', 'plum', 'teal']],
    ['clarity', 'Clarity', 'productivity', 'minimal', 0, 'font', ['snow', 'graphite', 'sand']],
    ['taskline', 'Taskline', 'productivity', 'pattern', 6, 'color', ['sky', 'noir', 'mint']],
    ['flowstate', 'Flowstate', 'productivity', 'aurora', 4, 'font', ['cobalt', 'teal', 'violet']],
    ['paperdesk', 'Paper Desk', 'productivity', 'editorial', 7, 'color', ['paper', 'snow', 'lavender']],
    ['graphite', 'Graphite', 'productivity', 'tilt', 6, 'color', ['graphite', 'midnight', 'forest']],
    ['bloom', 'Bloom', 'health', 'sunrise', 2, 'font', ['mint', 'peach', 'sky']],
    ['vital', 'Vital', 'health', 'proof', 4, 'font', ['nightgreen', 'ocean', 'crimson']],
    ['stride', 'Stride', 'health', 'poster', 9, 'color', ['lime', 'red', 'aqua']],
    ['calm', 'Calm', 'health', 'aurora', 11, 'font', ['lavender', 'mint', 'sky']],
    ['sage', 'Sage', 'health', 'minimal', 8, 'both', ['mint', 'forest', 'sand']],
    ['ledger', 'Ledger', 'finance', 'minimal', 11, 'font', ['noir', 'snow', 'sand']],
    ['vault', 'Vault', 'finance', 'tilt', 1, 'font', ['gold', 'midnight', 'nightgreen']],
    ['mintleaf', 'Mintleaf', 'finance', 'glow', 5, 'color', ['nightgreen', 'cobalt', 'violet']],
    ['growth', 'Growth', 'finance', 'proof', 0, 'both', ['forest', 'indigo', 'graphite']],
    ['brunch', 'Brunch', 'food', 'chat', 10, 'color', ['peach', 'lemon', 'blush']],
    ['saffron', 'Saffron', 'food', 'editorial', 8, 'both', ['cream', 'paper', 'peach']],
    ['bistro', 'Bistro', 'food', 'sunrise', 11, 'font', ['ember', 'crimson', 'forest']],
    ['zest', 'Zest', 'food', 'poster', 9, 'color', ['yellow', 'tangerine', 'lime']],
    ['arcade', 'Arcade', 'games', 'poster', 9, 'color', ['electric', 'pink', 'aqua']],
    ['quest', 'Quest', 'games', 'glow', 6, 'color', ['violet', 'crimson', 'nightgreen']],
    ['pixel', 'Pixel', 'games', 'pattern', 6, 'color', ['grape', 'graphite', 'cobalt']],
    ['nebula', 'Nebula', 'games', 'aurora', 4, 'font', ['plum', 'indigo', 'magenta']],
  ];
  const CAT_NAME = Object.fromEntries(P.CATEGORIES);
  P.THEMES = ROWS.map(([id, name, category, arch, fp, mode, pals]) => ({
    id, name, category, categoryName: CAT_NAME[category], arch, fp, mode, palettes: pals,
    swatches: pals.map((n) => PAL[n]),
  }));
  P.themeById = (id) => P.THEMES.find((t) => t.id === id);
  P.THEME_COUNT = { designs: P.THEMES.length, looks: P.THEMES.length * 3 };

  /** Applies a theme (colourway `variant` 0–2) to slide number i, keeping its words, screenshot and position in the set. */
  /** variant 0–2 = the theme's colourways; pass `custom` ([bg, bg2, accent]) for colours matched from your app (variant 3). */
  P.applyTheme = function (slide, theme, i, variant, custom) {
    const useCustom = Array.isArray(custom) && custom.length === 3;
    variant = useCustom ? 3 : Math.max(0, Math.min(2, variant | 0));
    const p = derive(useCustom ? custom : PAL[theme.palettes[variant]]);
    const F = FP[theme.fp] || FP[0];
    const spec = ARCH[theme.arch](p, i, COPY[theme.category] || COPY.productivity);
    const keepImage = slide.bg && slide.bg.image;
    slide.bg = Object.assign(
      { type: 'solid', color: p.bg1, c1: p.bg1, c2: p.bg2, angle: 180, image: keepImage || null, blur: 0, dim: 0, glows: [], glowStrength: 1, glowColor: null, pattern: 'none', patternColor: p.text, patternAlpha: 0.1, grain: 0 },
      clone(spec.bg)
    );
    if (!spec.bg.c1) slide.bg.c1 = p.bg1;
    if (!spec.bg.c2) slide.bg.c2 = p.bg2;
    const useFont = theme.mode !== 'color' && F.hlFont;
    Object.assign(slide.text, {
      font: F.font, weight: F.weight, size: Math.round(F.size * (spec.textScale || 1)), lh: F.lh, ls: F.ls || 0, upper: !!F.upper,
      color: p.text, hl: p.hl,
      hlFont: useFont ? F.hlFont : null, hlItalic: useFont ? !!F.hlItalic : false, hlWeight: F.hlWeight || 400, hlScale: useFont ? F.hlScale || 1 : 1,
      hlColorize: theme.mode !== 'font',
      subFont: F.body, subWeight: 500, subSize: 42, subColor: p.sub, align: 'center',
    });
    Object.assign(slide.device, { type: 'auto', rot: 0, tiltX: 0, tiltY: 0, x: 0.5, scale: 0.74, shadow: 0.6, color: p.frame, corner: 0.06 });
    P.applyLayout(slide, spec.layout || 'top');
    Object.assign(slide.device, clone(spec.device || {}));
    // theme badges are swapped out, but the user's own uploaded images/logos stay put
    const own = (slide.badges || []).filter((b) => b && b.kind === 'image');
    slide.badges = clone(spec.badges || []).concat(own);
    slide.ui = { font: F.body, chipBg: p.chipBg, chipText: p.chipText, star: '#FFC83D', card: p.card, accent: p.accent };
    slide.theme = theme.id;
    slide.variant = variant;
  };
})();
