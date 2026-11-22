/* Paneful demo — draws three screens of a fictional habit app ("Bloom") so a new project isn't empty.
 * Everything is drawn in code; no image files needed. */
(function () {
  'use strict';
  const P = (window.Paneful = window.Paneful || {});
  const W = 1179, H = 2556;
  const F = (w, px) => P.fontString('Geist', w, px);
  const rr = (ctx, x, y, w, h, r) => P.roundRect(ctx, x, y, w, h, r);

  function statusBar(ctx, dark) {
    const c = dark ? '#FFFFFF' : '#111111';
    ctx.fillStyle = c;
    ctx.font = F(600, 48);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', 120, 112);
    // signal
    for (let i = 0; i < 4; i++) { rr(ctx, 860 + i * 20, 124 - (i + 1) * 9, 13, (i + 1) * 9, 3); ctx.fill(); }
    // wifi
    ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(970, 130, 12 + i * 13, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
    // battery
    ctx.lineWidth = 4; rr(ctx, 1010, 96, 70, 34, 10); ctx.stroke();
    rr(ctx, 1016, 102, 52, 22, 6); ctx.fill();
    rr(ctx, 1084, 106, 6, 14, 3); ctx.fill();
  }

  function tabBar(ctx, active) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, H - 250, W, 250);
    ctx.fillStyle = '#ECEBE6';
    ctx.fillRect(0, H - 250, W, 2);
    const labels = ['Today', 'Insights', 'Focus', 'Profile'];
    labels.forEach((l, i) => {
      const cx = 150 + i * 293;
      const on = i === active;
      ctx.fillStyle = on ? '#2F5D46' : '#B5B4AE';
      rr(ctx, cx - 30, H - 205, 60, 60, 18); ctx.fill();
      ctx.font = F(on ? 600 : 500, 34);
      ctx.textAlign = 'center';
      ctx.fillText(l, cx, H - 105);
    });
    ctx.fillStyle = '#111';
    rr(ctx, W / 2 - 200, H - 32, 400, 14, 7); ctx.fill();
  }

  function check(ctx, cx, cy, r, done) {
    if (done) {
      ctx.fillStyle = '#2F5D46';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + 2); ctx.lineTo(cx - r * 0.08, cy + r * 0.32); ctx.lineTo(cx + r * 0.42, cy - r * 0.3); ctx.stroke();
    } else {
      ctx.strokeStyle = '#D6D4CC'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function screenToday(ctx) {
    ctx.fillStyle = '#F7F6F2'; ctx.fillRect(0, 0, W, H);
    statusBar(ctx, false);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8A8981'; ctx.font = F(500, 44); ctx.fillText('Thursday, 14 March', 80, 290);
    ctx.fillStyle = '#141414'; ctx.font = F(700, 110); ctx.fillText('Today', 76, 400);
    ctx.fillStyle = '#E3E9E2'; ctx.beginPath(); ctx.arc(1060, 340, 58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2F5D46'; ctx.font = F(700, 50); ctx.textAlign = 'center'; ctx.fillText('A', 1060, 358);
    // week strip
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    days.forEach((d, i) => {
      const x = 80 + i * 147, on = i === 3;
      ctx.fillStyle = on ? '#1E2B24' : '#FFFFFF';
      rr(ctx, x, 480, 125, 180, 44); ctx.fill();
      ctx.fillStyle = on ? '#9FC7AE' : '#9A998F'; ctx.font = F(600, 34); ctx.fillText(d, x + 62, 545);
      ctx.fillStyle = on ? '#FFFFFF' : '#1A1A1A'; ctx.font = F(700, 52); ctx.fillText(String(11 + i), x + 62, 620);
    });
    // progress card
    ctx.fillStyle = '#2F5D46'; rr(ctx, 80, 720, W - 160, 330, 60); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#CFE3D5'; ctx.font = F(500, 42); ctx.fillText('Daily goal', 150, 810);
    ctx.fillStyle = '#FFFFFF'; ctx.font = F(700, 96); ctx.fillText('3 of 5 done', 146, 925);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, 150, 975, W - 300, 26, 13); ctx.fill();
    ctx.fillStyle = '#A8E0B8'; rr(ctx, 150, 975, (W - 300) * 0.6, 26, 13); ctx.fill();
    // habits
    const habits = [['Morning walk', '12-day streak', '#F2C9A0', true], ['Read 20 pages', '8-day streak', '#B9D3F0', true], ['Drink water', '21-day streak', '#A8E0B8', true], ['Meditate', '3-day streak', '#D9C8F5', false], ['No phone in bed', 'New habit', '#F5C2C0', false]];
    habits.forEach(([name, sub, col, done], i) => {
      const y = 1110 + i * 230;
      ctx.fillStyle = '#FFFFFF'; rr(ctx, 80, y, W - 160, 200, 50); ctx.fill();
      ctx.fillStyle = col; rr(ctx, 120, y + 45, 110, 110, 34); ctx.fill();
      ctx.fillStyle = '#141414'; ctx.textAlign = 'left'; ctx.font = F(600, 50); ctx.fillText(name, 270, y + 92);
      ctx.fillStyle = '#8A8981'; ctx.font = F(500, 38); ctx.fillText(sub, 270, y + 148);
      check(ctx, W - 175, y + 100, 46, done);
    });
    tabBar(ctx, 0);
  }

  function screenInsights(ctx) {
    ctx.fillStyle = '#F7F6F2'; ctx.fillRect(0, 0, W, H);
    statusBar(ctx, false);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#141414'; ctx.font = F(700, 110); ctx.fillText('Insights', 76, 400);
    // segmented
    ctx.fillStyle = '#ECEAE3'; rr(ctx, 80, 470, W - 160, 110, 55); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 90, 480, (W - 180) / 2, 90, 45); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = F(600, 40); ctx.fillStyle = '#141414'; ctx.fillText('Week', 80 + (W - 160) / 4, 540);
    ctx.fillStyle = '#8A8981'; ctx.fillText('Month', 80 + ((W - 160) * 3) / 4, 540);
    // chart card
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 80, 640, W - 160, 900, 60); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#141414'; ctx.font = F(700, 200); ctx.fillText('86%', 140, 880);
    ctx.fillStyle = '#8A8981'; ctx.font = F(500, 42); ctx.fillText('completion this week', 150, 950);
    ctx.fillStyle = '#2F5D46'; rr(ctx, 790, 760, 230, 80, 40); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = F(600, 38); ctx.textAlign = 'center'; ctx.fillText('+12%', 905, 815);
    const vals = [0.55, 0.7, 0.62, 0.9, 0.78, 0.45, 0.66];
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    vals.forEach((v, i) => {
      const x = 150 + i * 128, bh = 380 * v, top = 1430 - bh;
      ctx.fillStyle = i === 3 ? '#2F5D46' : '#CFE3D5';
      rr(ctx, x, top, 84, bh, 26); ctx.fill();
      ctx.fillStyle = '#9A998F'; ctx.font = F(600, 34); ctx.fillText(days[i], x + 42, 1495);
    });
    // stat cards
    const stats = [['Best streak', '21 days'], ['Check-ins', '142']];
    stats.forEach(([l, v], i) => {
      const x = 80 + i * ((W - 160) / 2 + 15), w = (W - 160) / 2 - 15;
      ctx.fillStyle = i ? '#1E2B24' : '#FFFFFF'; rr(ctx, x, 1600, w, 320, 56); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = i ? '#9FC7AE' : '#8A8981'; ctx.font = F(500, 42); ctx.fillText(l, x + 55, 1700);
      ctx.fillStyle = i ? '#FFFFFF' : '#141414'; ctx.font = F(700, 96); ctx.fillText(v, x + 50, 1830);
    });
    // top habit row
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 80, 1980, W - 160, 230, 50); ctx.fill();
    ctx.fillStyle = '#A8E0B8'; rr(ctx, 120, 2040, 110, 110, 34); ctx.fill();
    ctx.fillStyle = '#141414'; ctx.font = F(600, 50); ctx.fillText('Most consistent', 270, 2085);
    ctx.fillStyle = '#8A8981'; ctx.font = F(500, 38); ctx.fillText('Drink water · 7 of 7 days', 270, 2145);
    tabBar(ctx, 1);
  }

  function screenFocus(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16271F'); g.addColorStop(1, '#0D1713');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    statusBar(ctx, true);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF'; ctx.font = F(700, 110); ctx.fillText('Focus', 76, 400);
    ctx.fillStyle = '#86A896'; ctx.font = F(500, 44); ctx.fillText('Session 2 of 4', 80, 480);
    const cx = W / 2, cy = 1180, r = 380;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#23372D'; ctx.lineWidth = 48;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#8BC79F';
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.68); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF'; ctx.font = F(600, 200); ctx.fillText('24:18', cx, cy + 50);
    ctx.fillStyle = '#86A896'; ctx.font = F(500, 46); ctx.fillText('Deep work', cx, cy + 150);
    // controls
    ctx.fillStyle = '#23372D';
    ctx.beginPath(); ctx.arc(cx - 300, 1900, 90, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 300, 1900, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2F1EE';
    ctx.beginPath(); ctx.arc(cx, 1900, 140, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16271F';
    rr(ctx, cx - 45, 1845, 30, 110, 10); ctx.fill();
    rr(ctx, cx + 15, 1845, 30, 110, 10); ctx.fill();
    ctx.fillStyle = '#8BC79F';
    rr(ctx, cx - 330, 1870, 60, 60, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 275, 1860); ctx.lineTo(cx + 335, 1900); ctx.lineTo(cx + 275, 1940); ctx.closePath(); ctx.fill();
    // session dots
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < 2 ? '#8BC79F' : '#23372D';
      rr(ctx, cx - 190 + i * 100, 2180, 80, 20, 10); ctx.fill();
    }
  }

  const SCREENS = [screenToday, screenInsights, screenFocus];
  P.DEMO_TEXT = [
    { headline: 'Build habits that *actually stick*', sub: 'Simple daily check-ins, zero guilt.' },
    { headline: 'See your *progress* at a glance', sub: 'Weekly insights that keep you going.' },
    { headline: 'Focus when it *matters*', sub: 'A calm timer for deep work.' },
  ];

  /** Returns the three demo screens as canvases (fonts must be loaded first). */
  P.demoCanvases = async function () {
    await P.ensureFonts(['Geist']);
    return SCREENS.map((fn) => {
      const c = P.mkCanvas(W, H);
      fn(c.getContext('2d'));
      return c;
    });
  };
})();
