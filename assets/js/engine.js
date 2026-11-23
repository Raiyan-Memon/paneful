/* Paneful engine — draws one slide onto a canvas at any export size.
 * Pure Canvas 2D, plus a tiny WebGL pass for the 3D device tilt. No dependencies, no network.
 * Layout lives in a reference box (1000 wide) that is scaled to fit each export size;
 * backgrounds always fill the whole canvas. */
(function () {
  'use strict';
  const P = (window.Paneful = window.Paneful || {});
  const D2R = Math.PI / 180;

  /* ───────── export sizes ───────── */
  P.SIZES = {
    ios69:   { label: 'iPhone 6.9″', store: 'App Store',   w: 1320, h: 2868, frame: 'iphone',  folder: 'iPhone 6.9in - 1320x2868', note: 'Required' },
    ios65:   { label: 'iPhone 6.5″', store: 'App Store',   w: 1284, h: 2778, frame: 'iphone',  folder: 'iPhone 6.5in - 1284x2778', note: 'Optional' },
    ipad13:  { label: 'iPad 13″',    store: 'App Store',   w: 2064, h: 2752, frame: 'tablet',  folder: 'iPad 13in - 2064x2752',   note: 'iPad apps' },
    gpPhone: { label: 'Phone',       store: 'Google Play', w: 1080, h: 1920, frame: 'android', folder: 'Phone - 1080x1920',       note: '9:16' },
    gpTab:   { label: 'Tablet',      store: 'Google Play', w: 1440, h: 2560, frame: 'tablet',  folder: 'Tablet - 1440x2560',      note: '9:16' },
  };
  P.FEATURE = { label: 'Feature graphic', store: 'Google Play', w: 1024, h: 500 };

  /* ───────── fonts (self-hosted, see assets/css/fonts.css) ───────── */
  P.FONTS = [
    { name: 'Geist', min: 100, max: 900 },
    { name: 'Inter', min: 100, max: 900 },
    { name: 'Manrope', min: 200, max: 800 },
    { name: 'Outfit', min: 100, max: 900 },
    { name: 'Sora', min: 100, max: 800 },
    { name: 'Space Grotesk', min: 300, max: 700 },
    { name: 'Bricolage Grotesque', min: 200, max: 800 },
    { name: 'Nunito', min: 200, max: 1000 },
    { name: 'DM Sans', min: 100, max: 1000 },
    { name: 'Fraunces', min: 100, max: 900, italic: true },
    { name: 'Playfair Display', min: 400, max: 900, italic: true },
    { name: 'Instrument Serif', min: 400, max: 400, italic: true },
    { name: 'DM Serif Display', min: 400, max: 400, italic: true },
    { name: 'Archivo Black', min: 400, max: 400 },
    { name: 'Caveat', min: 400, max: 700 },
    { name: 'JetBrains Mono', min: 100, max: 800 },
  ];
  const FONT_MAP = Object.fromEntries(P.FONTS.map((f) => [f.name, f]));
  P.fontWeight = (family, w) => {
    const f = FONT_MAP[family];
    if (!f) return w;
    return Math.max(f.min, Math.min(f.max, w));
  };
  P.fontString = (family, weight, px, italic) => `${italic && FONT_MAP[family] && FONT_MAP[family].italic ? 'italic ' : ''}${P.fontWeight(family, weight)} ${Math.max(1, px).toFixed(2)}px "${family}", ui-sans-serif, system-ui, sans-serif`;
  /** Resolves once the given families are ready to draw on canvas (italic faces too). */
  P.ensureFonts = function (families) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const list = [...new Set(families.filter(Boolean))];
    const jobs = [];
    list.forEach((f) => {
      jobs.push(document.fonts.load(`${P.fontWeight(f, 600)} 40px "${f}"`).catch(() => null));
      if (FONT_MAP[f] && FONT_MAP[f].italic) jobs.push(document.fonts.load(`italic ${P.fontWeight(f, 400)} 40px "${f}"`).catch(() => null));
    });
    return Promise.all(jobs).then(() => undefined);
  };
  const canSpace = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;

  /* ───────── device frames ───────── */
  P.FRAMES = {
    iphone:  { label: 'iPhone',  aspect: 1320 / 2868, radius: 0.165, bezel: 0.034, rim: 0.012 },
    android: { label: 'Android', aspect: 1080 / 2400, radius: 0.105, bezel: 0.028, rim: 0.010 },
    tablet:  { label: 'Tablet',  aspect: 2064 / 2752, radius: 0.060, bezel: 0.045, rim: 0.008 },
  };
  P.FRAME_COLORS = {
    black:    { label: 'Black',    base: '#1B1B1E', hi: '#45454C' },
    silver:   { label: 'Silver',   base: '#CFD0D4', hi: '#F6F6F8' },
    titanium: { label: 'Titanium', base: '#85817B', hi: '#BDB8B0' },
    sand:     { label: 'Sand',     base: '#C2B096', hi: '#E8DCC8' },
    sage:     { label: 'Sage',     base: '#71877A', hi: '#A9BDAE' },
  };

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  P.roundRect = rr;

  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  P.mkCanvas = mkCanvas;

  /** Draws an image to fill a box, top-aligned (keeps the status bar visible). */
  function drawCover(ctx, img, x, y, w, h, align) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const sc = Math.max(w / iw, h / ih);
    const dw = iw * sc, dh = ih * sc;
    const dx = x + (w - dw) / 2;
    const dy = align === 'center' ? y + (h - dh) / 2 : y;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawPlaceholder(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#2A2A2F');
    g.addColorStop(1, '#1C1C20');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const s = w * 0.16, cx = x + w / 2, cy = y + h / 2 - w * 0.06;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, w * 0.008);
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.22); ctx.lineTo(cx, cy + s * 0.22);
    ctx.moveTo(cx - s * 0.22, cy); ctx.lineTo(cx + s * 0.22, cy);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = P.fontString('Geist', 500, w * 0.052);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add a screenshot', cx, cy + s * 0.95);
    ctx.restore();
  }

  /** Renders the device (or bare screenshot) to its own canvas. Width w is the body width in px.
   *  Returns { canvas, bodyW, bodyH, pad } — pad is the transparent margin around the body (room for side buttons). */
  P.drawDevice = function (type, colorKey, w, img, opts) {
    opts = opts || {};
    const pad = Math.ceil(w * 0.02);
    if (type === 'none' || !P.FRAMES[type]) {
      const aspect = img ? (img.naturalWidth || img.width) / (img.naturalHeight || img.height) : P.FRAMES.iphone.aspect;
      const h = w / aspect;
      const c = mkCanvas(w + pad * 2, h + pad * 2);
      const ctx = c.getContext('2d');
      ctx.save();
      rr(ctx, pad, pad, w, h, w * (opts.corner == null ? 0.06 : opts.corner));
      ctx.clip();
      if (img) drawCover(ctx, img, pad, pad, w, h); else drawPlaceholder(ctx, pad, pad, w, h);
      ctx.restore();
      return { canvas: c, bodyW: w, bodyH: h, pad };
    }
    const F = P.FRAMES[type];
    const col = P.FRAME_COLORS[colorKey] || P.FRAME_COLORS.black;
    const b = w * F.bezel, rim = w * F.rim, R = w * F.radius;
    const h = (w - 2 * b) / F.aspect + 2 * b;
    const c = mkCanvas(w + pad * 2, h + pad * 2);
    const ctx = c.getContext('2d');
    const x = pad, y = pad;

    // side buttons (drawn first so the body sits on top of them)
    const btnT = w * 0.011;
    ctx.fillStyle = col.base;
    const btn = (side, top, len) => {
      const bx = side === 'L' ? x - btnT : x + w - w * 0.004;
      rr(ctx, bx, y + top, btnT + w * 0.004, len, btnT * 0.6);
      ctx.fill();
    };
    if (type === 'iphone') {
      btn('L', h * 0.165, h * 0.038);
      btn('L', h * 0.235, h * 0.066);
      btn('L', h * 0.315, h * 0.066);
      btn('R', h * 0.26, h * 0.1);
    } else if (type === 'android') {
      btn('R', h * 0.2, h * 0.06);
      btn('R', h * 0.3, h * 0.11);
    } else {
      // tablet: top button + volume on the right edge
      rr(ctx, x + w * 0.78, y - btnT, w * 0.09, btnT + w * 0.004, btnT * 0.6); ctx.fill();
      btn('R', h * 0.08, h * 0.06);
      btn('R', h * 0.15, h * 0.06);
    }

    // metal body
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, col.hi);
    g.addColorStop(0.18, col.base);
    g.addColorStop(0.82, col.base);
    g.addColorStop(1, col.hi);
    ctx.fillStyle = g;
    rr(ctx, x, y, w, h, R);
    ctx.fill();
    // edge highlight
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = Math.max(0.5, w * 0.0025);
    rr(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, R);
    ctx.stroke();
    ctx.restore();
    // black bezel
    ctx.fillStyle = '#050506';
    rr(ctx, x + rim, y + rim, w - 2 * rim, h - 2 * rim, R - rim);
    ctx.fill();
    // screen
    const sx = x + b, sy = y + b, sw = w - 2 * b, sh = h - 2 * b;
    ctx.save();
    rr(ctx, sx, sy, sw, sh, Math.max(0, R - b));
    ctx.clip();
    if (img) drawCover(ctx, img, sx, sy, sw, sh); else drawPlaceholder(ctx, sx, sy, sw, sh);
    ctx.restore();
    // camera cut-outs
    ctx.fillStyle = '#050506';
    if (type === 'iphone') {
      const iw = sw * 0.3, ih = sw * 0.088;
      rr(ctx, x + w / 2 - iw / 2, sy + sw * 0.032, iw, ih, ih / 2);
      ctx.fill();
    } else if (type === 'android') {
      ctx.beginPath();
      ctx.arc(x + w / 2, sy + sw * 0.055, sw * 0.026, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1d1d22';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + b / 2, b * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    return { canvas: c, bodyW: w, bodyH: h, pad };
  };

  /* ───────── 3D tilt (WebGL perspective pass) ───────── */
  let gl = null, glc = null, glBuf = null, glTex = null, glOK = null, glMax = 0;
  function initGL() {
    if (glOK !== null) return glOK;
    try {
      glc = document.createElement('canvas');
      gl = glc.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true, alpha: true });
      if (!gl) return (glOK = false);
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      const prec = hp && hp.precision > 0 ? 'highp' : 'mediump';
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec4 p; attribute vec2 uv; varying vec2 v; void main(){ v = uv; gl_Position = p; }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision ${prec} float; varying vec2 v; uniform sampler2D t; void main(){ gl_FragColor = texture2D(t, v); }`));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      glBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
      const lp = gl.getAttribLocation(prog, 'p'), lu = gl.getAttribLocation(prog, 'uv');
      gl.enableVertexAttribArray(lp);
      gl.enableVertexAttribArray(lu);
      gl.vertexAttribPointer(lp, 4, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 24, 16);
      glTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      glMax = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), vp[0], vp[1]);
      glOK = true;
    } catch (e) {
      console.warn('Paneful: 3D tilt unavailable', e);
      glOK = false;
    }
    return glOK;
  }

  /** Projects a canvas with perspective. Returns { canvas, cx, cy } where (cx, cy) is where the source centre lands,
   *  or null if WebGL is unavailable (caller then draws flat). The returned canvas is reused: draw it right away. */
  P.tilt = function (src, tiltX, tiltY) {
    if (!initGL()) return null;
    const w = src.width, h = src.height;
    if (w > glMax || h > glMax) return null;
    const ax = tiltX * D2R, ay = tiltY * D2R;
    const d = 2.4 * Math.max(w, h);
    const pts = [[-w / 2, -h / 2, 0, 0], [-w / 2, h / 2, 0, 1], [w / 2, -h / 2, 1, 0], [w / 2, h / 2, 1, 1]].map(([x, y, u, v]) => {
      const x1 = x * Math.cos(ay), z1 = x * Math.sin(ay);
      const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
      const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      const k = d / (d - z2);
      return { x: x1, y: y2, k, px: x1 * k, py: y2 * k, u, v };
    });
    const minX = Math.min(...pts.map((p) => p.px)), maxX = Math.max(...pts.map((p) => p.px));
    const minY = Math.min(...pts.map((p) => p.py)), maxY = Math.max(...pts.map((p) => p.py));
    const W = Math.ceil(maxX - minX) + 2, H = Math.ceil(maxY - minY) + 2;
    if (W > glMax || H > glMax) return null;
    const cx = -minX + 1, cy = -minY + 1;
    const qx = W / 2 - cx, qy = H / 2 - cy;
    const data = new Float32Array(24);
    pts.forEach((p, i) => {
      data.set([(p.x - qx / p.k) / (W / 2), -(p.y - qy / p.k) / (H / 2), 0, 1 / p.k, p.u, p.v], i * 6);
    });
    glc.width = W;
    glc.height = H;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return { canvas: glc, cx, cy };
  };

  /* ───────── backgrounds ───────── */
  function linearVec(W, H, angle) {
    const a = angle * D2R;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(W * dx) + Math.abs(H * dy);
    return [W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2];
  }
  P.drawBackground = function (ctx, W, H, bg, getImage) {
    bg = bg || {};
    ctx.save();
    ctx.fillStyle = bg.color || '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const t = bg.type;
    if (t === 'linear' || t === 'split') {
      const g = ctx.createLinearGradient(...linearVec(W, H, bg.angle || 0));
      if (t === 'split') {
        g.addColorStop(0, bg.c1); g.addColorStop(0.5, bg.c1);
        g.addColorStop(0.5, bg.c2); g.addColorStop(1, bg.c2);
      } else {
        g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (t === 'radial') {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, Math.max(W, H) * 0.85);
      g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (t === 'image') {
      const img = bg.image && getImage ? getImage(bg.image) : null;
      if (img) {
        const blur = (bg.blur || 0) * (W / 1000);
        if (blur > 0) {
          ctx.filter = `blur(${blur.toFixed(1)}px)`;
          const m = blur * 3;
          drawCover(ctx, img, -m, -m, W + m * 2, H + m * 2, 'center');
          ctx.filter = 'none';
        } else {
          drawCover(ctx, img, 0, 0, W, H, 'center');
        }
      }
      if (bg.dim) {
        ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    drawPattern(ctx, W, H, bg);
    // soft glows (radial light blobs)
    const strength = bg.glowStrength == null ? 1 : bg.glowStrength;
    if (strength > 0) {
      (bg.glows || []).forEach((g) => {
        const R = Math.max(1, g.r * Math.max(W, H));
        const cx = g.x * W, cy = g.y * H;
        const a = Math.min(1, (g.a == null ? 0.5 : g.a) * strength);
        const col = bg.glowColor || g.color;
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, P.rgba(col, a));
        gr.addColorStop(0.42, P.rgba(col, a * 0.42));
        gr.addColorStop(1, P.rgba(col, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      });
    }
    if (bg.grain > 0) drawGrain(ctx, W, H, bg.grain);
    ctx.restore();
  };

  /* colour helpers */
  P.hexToRgb = function (hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  P.rgba = function (hex, a) {
    if (/^rgba?\(/.test(hex)) return hex;
    const [r, g, b] = P.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  P.luminance = function (hex) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const [r, g, b] = P.hexToRgb(hex);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  P.contrast = (a, b) => { const x = P.luminance(a), y = P.luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  P.mix = function (a, b, t) {
    const A = P.hexToRgb(a), B = P.hexToRgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  function drawPattern(ctx, W, H, bg) {
    const kind = bg.pattern;
    if (!kind || kind === 'none') return;
    const cell = W * 0.05;
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = P.rgba(bg.patternColor || '#FFFFFF', bg.patternAlpha == null ? 0.12 : bg.patternAlpha);
    ctx.beginPath();
    if (kind === 'dots') {
      const r = cell * 0.085;
      for (let y = cell / 2; y < H; y += cell) for (let x = cell / 2; x < W; x += cell) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
      ctx.fill();
    } else if (kind === 'grid') {
      ctx.lineWidth = Math.max(1, cell * 0.03);
      for (let x = 0; x <= W; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += cell) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    } else if (kind === 'stripes') {
      ctx.lineWidth = cell * 0.18;
      for (let x = -H; x < W + H; x += cell * 0.9) { ctx.moveTo(x, 0); ctx.lineTo(x + H, H); }
      ctx.stroke();
    }
    ctx.restore();
  }

  let grainTile = null;
  function drawGrain(ctx, W, H, amount) {
    if (!grainTile) {
      grainTile = mkCanvas(160, 160);
      const g = grainTile.getContext('2d');
      const im = g.createImageData(160, 160);
      let seed = 1337;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 128 + (rnd() - 0.5) * 140;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
        im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    }
    const pat = ctx.createPattern(grainTile, 'repeat');
    const k = Math.max(1, W / 700);
    if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(k));
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, amount) * 0.35;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ───────── text ───────── */
  /** Splits "Track *every* habit" into words, marking words inside *asterisks* as highlighted. Supports line breaks. */
  P.parseRich = function (str) {
    const paras = String(str || '').split('\n');
    let hl = false;
    return paras.map((p) => {
      const words = [];
      let cur = '', curHl = hl;
      const push = () => { if (cur) words.push({ t: cur, hl: curHl }); cur = ''; };
      for (const ch of p) {
        if (ch === '*') { push(); hl = !hl; curHl = hl; continue; }
        if (ch === ' ') { push(); words.push({ space: true }); curHl = hl; continue; }
        if (!cur) curHl = hl;
        cur += ch;
      }
      push();
      // merge into "words" separated by spaces: each word may contain several runs (e.g. half highlighted)
      const out = [];
      let w = null;
      for (const r of words) {
        if (r.space) { w = null; continue; }
        if (!w) { w = { runs: [] }; out.push(w); }
        w.runs.push(r);
      }
      return out;
    });
  };

  /* st = { font, weight, italic, px, color, ls (em), upper }; hl = accent-word style { font, weight, italic, scale, color } */
  function runFont(st, hl, isHl) {
    if (isHl && hl) return P.fontString(hl.font || st.font, hl.weight || st.weight, st.px * (hl.scale || 1), hl.italic);
    return P.fontString(st.font, st.weight, st.px, st.italic);
  }
  function setSpacing(ctx, st) {
    if (canSpace) ctx.letterSpacing = st && st.ls ? (st.ls * st.px).toFixed(2) + 'px' : '0px';
  }
  function layoutBlock(ctx, str, st, hl, lh, maxW) {
    if (st.upper) str = String(str || '').toUpperCase();
    setSpacing(ctx, st);
    ctx.font = runFont(st, hl, false);
    const space = ctx.measureText(' ').width;
    const lines = [];
    for (const para of P.parseRich(str)) {
      let line = { words: [], w: 0 };
      for (const word of para) {
        word.runs.forEach((r) => { ctx.font = runFont(st, hl, r.hl); r.w = ctx.measureText(r.t).width; });
        const ww = word.runs.reduce((a, r) => a + r.w, 0);
        const add = line.words.length ? space + ww : ww;
        if (line.words.length && line.w + add > maxW) {
          lines.push(line);
          line = { words: [{ ...word, ww }], w: ww };
        } else {
          line.words.push({ ...word, ww });
          line.w += add;
        }
      }
      lines.push(line);
    }
    ctx.font = runFont(st, hl, false);
    const m = ctx.measureText('Hg');
    const asc = m.fontBoundingBoxAscent || st.px * 0.92;
    const desc = m.fontBoundingBoxDescent || st.px * 0.24;
    const lineH = st.px * lh;
    setSpacing(ctx, null);
    return { lines, st, hl, lineH, space, asc, desc, height: lines.length ? lineH * lines.length : 0 };
  }

  function drawBlock(ctx, L, x, top, align) {
    setSpacing(ctx, L.st);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    L.lines.forEach((line, i) => {
      let lx = align === 'center' ? x - line.w / 2 : align === 'right' ? x - line.w : x;
      const base = top + i * L.lineH + (L.lineH - (L.asc + L.desc)) / 2 + L.asc;
      line.words.forEach((word, wi) => {
        if (wi) lx += L.space;
        for (const r of word.runs) {
          ctx.font = runFont(L.st, L.hl, r.hl);
          ctx.fillStyle = r.hl && L.hl && L.hl.color ? L.hl.color : L.st.color;
          ctx.fillText(r.t, lx, base);
          lx += r.w;
        }
      });
    });
    setSpacing(ctx, null);
  }

  /** Accent-word style for a text object. Words in *stars* use it. */
  P.accentStyle = function (t) {
    const own = t.hlFont && t.hlFont !== t.font;
    return {
      font: t.hlFont || t.font,
      weight: own ? P.fontWeight(t.hlFont, t.hlWeight || 400) : t.weight,
      italic: !!t.hlItalic,
      scale: t.hlScale || 1,
      color: t.hlColorize === false ? t.color : t.hl,
    };
  };

  /** Lays out headline + subtitle. scale = px per reference unit. */
  P.layoutText = function (ctx, t, scale, maxW) {
    const hl = P.accentStyle(t);
    const headSt = { font: t.font, weight: t.weight, italic: false, px: t.size * scale, color: t.color, ls: t.ls || 0, upper: !!t.upper };
    const subSt = { font: t.subFont || t.font, weight: t.subWeight || 500, italic: false, px: t.subSize * scale, color: t.subColor, ls: 0, upper: false };
    const head = t.headline ? layoutBlock(ctx, t.headline, headSt, hl, t.lh || 1.08, maxW) : null;
    const sub = t.sub ? layoutBlock(ctx, t.sub, subSt, { ...hl, scale: 1 }, 1.3, maxW) : null;
    const gap = head && sub ? t.subSize * scale * 0.55 : 0;
    return { head, sub, gap, height: (head ? head.height : 0) + gap + (sub ? sub.height : 0) };
  };
  P.drawText = function (ctx, t, lay, x, top) {
    if (lay.head) drawBlock(ctx, lay.head, x, top, t.align);
    if (lay.sub) drawBlock(ctx, lay.sub, x, top + (lay.head ? lay.head.height : 0) + lay.gap, t.align);
  };

  /* ───────── elements (badges drawn in code) ───────── */
  P.BADGE_KINDS = {
    chip:    { label: 'Chip',        text: 'New feature', icon: 'spark' },
    bubble:  { label: 'Bubble',      text: 'Love this app!' },
    rating:  { label: 'Rating',      text: '4.9 rating', sub: '12K reviews' },
    laurel:  { label: 'Award',       text: 'Editors’ Choice', sub: 'App Store' },
    stat:    { label: 'Stat',        text: '2M+', sub: 'happy users' },
    review:  { label: 'Review',      text: 'Changed my mornings', sub: '“Simple, calm and genuinely useful. I use it every single day.”', author: 'Priya, India' },
    sparkle: { label: 'Sparkle' },
    image:   { label: 'Image' }, // uploaded logo / icon / sticker / SVG (b.asset = image id)
  };
  P.defaultUI = () => ({ font: 'Geist', chipBg: '#FFFFFF', chipText: '#16161A', star: '#FFC83D', card: 'rgba(255,255,255,0.12)', accent: '#7FA88A' });

  function starPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr2 = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    ctx.closePath();
  }
  function sparklePath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r);
    ctx.closePath();
  }
  function wrapLines(ctx, str, maxW) {
    const out = [];
    let line = '';
    String(str || '').split(/\s+/).filter(Boolean).forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function softShadow(ctx, fs, k) {
    ctx.shadowColor = `rgba(0,0,0,${0.22 * (k || 1)})`;
    ctx.shadowBlur = fs * 0.9;
    ctx.shadowOffsetY = fs * 0.28;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  /** Draws one element centred at (0,0). Returns its { w, h }. */
  function drawBadge(ctx, b, fs, ui, text, getImage) {
    const F = (w, k, it) => P.fontString(ui.font || 'Geist', w, fs * (k || 1), it);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const kind = b.kind;
    if (kind === 'image') {
      // size sets the longer side: size 40 → 200 units of the 1000-wide reference box
      const img = b.asset && getImage ? getImage(b.asset) : null;
      const long = fs * 5;
      const iw = img ? img.naturalWidth || img.width : 1, ih = img ? img.naturalHeight || img.height : 1;
      const w = iw >= ih ? long : (long * iw) / ih, h = iw >= ih ? (long * ih) / iw : long;
      ctx.save();
      ctx.globalAlpha = b.opacity == null ? 1 : b.opacity;
      if (!img) {
        ctx.fillStyle = 'rgba(127,127,127,0.18)';
        rr(ctx, -w / 2, -h / 2, w, h, fs * 0.6);
        ctx.fill();
      } else {
        let src = img;
        const r = (b.radius || 0) * Math.min(w, h) * 0.5;
        if (r > 0) {
          // round the corners off-screen so the shadow follows the rounded shape
          const c = mkCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
          const g = c.getContext('2d');
          rr(g, 0, 0, c.width, c.height, r);
          g.clip();
          g.drawImage(img, 0, 0, c.width, c.height);
          src = c;
        }
        if (b.shadow) softShadow(ctx, fs, 1.3);
        ctx.drawImage(src, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
      return { w, h };
    }
    if (kind === 'sparkle') {
      const r = fs * 1.3;
      ctx.save();
      ctx.shadowColor = P.rgba(ui.accent || '#FFFFFF', 0.6);
      ctx.shadowBlur = fs * 1.2;
      ctx.fillStyle = ui.accent || '#FFFFFF';
      sparklePath(ctx, 0, 0, r);
      ctx.fill();
      ctx.restore();
      return { w: r * 2, h: r * 2 };
    }
    if (kind === 'chip' || kind === 'bubble') {
      ctx.font = F(600);
      const tw = ctx.measureText(b.text || '').width;
      const icon = kind === 'chip' && b.icon && b.icon !== 'none' ? b.icon : null;
      const iw = icon ? fs * 1.45 : 0;
      const padX = fs * 0.9;
      const h = kind === 'bubble' ? fs * 2.3 : fs * 2.05;
      const w = tw + iw + padX * 2;
      const r = kind === 'bubble' ? fs * 0.85 : h / 2;
      ctx.save();
      softShadow(ctx, fs);
      ctx.fillStyle = ui.chipBg;
      rr(ctx, -w / 2, -h / 2, w, h, r);
      ctx.fill();
      if (kind === 'bubble') {
        const right = b.tail === 'right';
        const tx = right ? w / 2 - fs * 1.4 : -w / 2 + fs * 1.4;
        ctx.beginPath();
        ctx.moveTo(tx - fs * 0.5, h / 2 - 1);
        ctx.lineTo(tx + (right ? fs * 0.7 : -fs * 0.7), h / 2 + fs * 0.75);
        ctx.lineTo(tx + fs * 0.5, h / 2 - 1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      let x = -w / 2 + padX;
      if (icon) {
        const cx = x + fs * 0.5;
        ctx.fillStyle = ui.accent || ui.star;
        if (icon === 'star') { ctx.fillStyle = ui.star; starPath(ctx, cx, 0, fs * 0.58); ctx.fill(); }
        else if (icon === 'dot') { ctx.beginPath(); ctx.arc(cx, 0, fs * 0.32, 0, Math.PI * 2); ctx.fill(); }
        else { sparklePath(ctx, cx, 0, fs * 0.6); ctx.fill(); }
        x += iw;
      }
      ctx.fillStyle = ui.chipText;
      ctx.font = F(600);
      ctx.fillText(b.text || '', x, fs * 0.04);
      return { w, h: h + (kind === 'bubble' ? fs * 0.75 : 0) };
    }
    if (kind === 'rating') {
      const sr = fs * 0.62, gap = fs * 1.42;
      const sw = gap * 4 + sr * 2;
      ctx.font = F(700, 0.95);
      const tw = ctx.measureText(b.text || '').width;
      ctx.font = F(500, 0.72);
      const sw2 = b.sub ? ctx.measureText(b.sub).width : 0;
      const w = Math.max(sw, tw, sw2), h = sr * 2 + fs * 1.5 + (b.sub ? fs * 1.05 : 0);
      const top = -h / 2;
      ctx.fillStyle = ui.star;
      for (let i = 0; i < 5; i++) { starPath(ctx, -sw / 2 + sr + i * gap, top + sr, sr); ctx.fill(); }
      ctx.textAlign = 'center';
      ctx.fillStyle = text.color;
      ctx.font = F(700, 0.95);
      ctx.fillText(b.text || '', 0, top + sr * 2 + fs * 0.85);
      if (b.sub) { ctx.fillStyle = text.subColor; ctx.font = F(500, 0.72); ctx.fillText(b.sub, 0, top + sr * 2 + fs * 1.95); }
      return { w, h };
    }
    if (kind === 'laurel') {
      ctx.font = F(700, 0.95);
      const tw = ctx.measureText(b.text || '').width;
      ctx.font = F(500, 0.7);
      const sw2 = b.sub ? ctx.measureText(b.sub).width : 0;
      const inner = Math.max(tw, sw2);
      const bh = fs * 3.1;
      const w = inner + fs * 4.6;
      ctx.textAlign = 'center';
      ctx.fillStyle = text.color;
      ctx.font = F(700, 0.95);
      ctx.fillText(b.text || '', 0, b.sub ? -fs * 0.42 : 0);
      if (b.sub) { ctx.fillStyle = text.subColor; ctx.font = F(500, 0.7); ctx.fillText(b.sub, 0, fs * 0.62); }
      // laurel branches
      ctx.fillStyle = text.color;
      [-1, 1].forEach((side) => {
        const bx = side * (inner / 2 + fs * 1.25);
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const ang = (-0.95 + t * 1.75) * side;
          const px = bx + side * Math.sin(t * Math.PI) * fs * 0.55;
          const py = bh * 0.42 - t * bh * 0.86;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(ang + (side > 0 ? 0.5 : -0.5));
          ctx.beginPath();
          ctx.ellipse(side * fs * 0.32, 0, fs * 0.38, fs * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      return { w, h: bh };
    }
    if (kind === 'stat') {
      ctx.font = F(800, 1.75);
      const tw = ctx.measureText(b.text || '').width;
      ctx.font = F(500, 0.72);
      const sw2 = b.sub ? ctx.measureText(b.sub).width : 0;
      const pad = fs * 0.95;
      const w = Math.max(tw, sw2) + pad * 2, h = fs * 1.75 + (b.sub ? fs * 1.1 : 0) + pad * 1.7;
      ctx.save();
      ctx.fillStyle = ui.card;
      rr(ctx, -w / 2, -h / 2, w, h, fs * 0.85);
      ctx.fill();
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillStyle = text.color;
      ctx.font = F(800, 1.75);
      ctx.fillText(b.text || '', -w / 2 + pad, -h / 2 + pad * 0.85 + fs * 0.88);
      if (b.sub) { ctx.fillStyle = text.subColor; ctx.font = F(500, 0.72); ctx.fillText(b.sub, -w / 2 + pad, -h / 2 + pad * 0.85 + fs * 2.25); }
      return { w, h };
    }
    if (kind === 'review') {
      const w = fs * 15, pad = fs * 0.95;
      ctx.font = F(400, 0.78);
      const lines = wrapLines(ctx, b.sub || '', w - pad * 2).slice(0, 4);
      const h = pad * 2 + fs * 0.75 + fs * 0.6 + fs * 1.05 + lines.length * fs * 1.12 + (b.author ? fs * 1.15 : 0);
      ctx.save();
      softShadow(ctx, fs, 1.2);
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, -w / 2, -h / 2, w, h, fs * 0.9);
      ctx.fill();
      ctx.restore();
      let y = -h / 2 + pad + fs * 0.38;
      ctx.fillStyle = ui.star;
      for (let i = 0; i < 5; i++) { starPath(ctx, -w / 2 + pad + fs * 0.38 + i * fs * 0.92, y, fs * 0.38); ctx.fill(); }
      y += fs * 0.6 + fs * 0.62;
      ctx.fillStyle = '#16161A';
      ctx.font = F(700, 0.9);
      ctx.fillText(b.text || '', -w / 2 + pad, y);
      y += fs * 1.05;
      ctx.fillStyle = '#3A3A42';
      ctx.font = F(400, 0.78);
      lines.forEach((l) => { ctx.fillText(l, -w / 2 + pad, y); y += fs * 1.12; });
      if (b.author) { ctx.fillStyle = '#8A8A93'; ctx.font = F(500, 0.66); ctx.fillText('— ' + b.author, -w / 2 + pad, y + fs * 0.1); }
      return { w, h };
    }
    return { w: 0, h: 0 };
  }

  /** Draws a slide's elements. Returns hit boxes [{ id, x, y, w, h }] in canvas px. */
  P.drawBadges = function (ctx, slide, s, ox, oy, ref, getImage, behind) {
    const ui = Object.assign(P.defaultUI(), slide.ui || {});
    const out = [];
    // array order is stacking order; behind = true draws only the elements set to sit behind the phone
    (slide.badges || []).forEach((b) => {
      if (behind != null && !!b.behind !== behind) return;
      const fs = (b.size || 34) * s;
      const cx = ox + b.x * ref.w * s, cy = oy + b.y * ref.h * s;
      ctx.save();
      ctx.translate(cx, cy);
      if (b.rot) ctx.rotate(b.rot * D2R);
      let m = { w: 0, h: 0 };
      try { m = drawBadge(ctx, b, fs, ui, slide.text, getImage); } catch (e) { console.warn('element', e); }
      noShadow(ctx);
      ctx.restore();
      out.push({ id: b.id, x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h, cx, cy, rot: b.rot || 0, behind: !!b.behind });
    });
    return out;
  };

  /* ───────── slide ───────── */
  P.refFor = (W, H) => (W / H > 0.62 ? { w: 1000, h: 1333 } : { w: 1000, h: 2172 });

  function placeDevice(ctx, dv, type, img, cx, top, bodyW, opts) {
    const dev = P.drawDevice(type, dv.color, bodyW, img, { corner: dv.corner });
    let src = dev.canvas, ocx = dev.canvas.width / 2, ocy = dev.canvas.height / 2;
    if (dv.tiltX || dv.tiltY) {
      const t = P.tilt(dev.canvas, dv.tiltX || 0, dv.tiltY || 0);
      if (t) { src = t.canvas; ocx = t.cx; ocy = t.cy; }
    }
    const cy = top + dev.bodyH / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (dv.rot) ctx.rotate(dv.rot * D2R);
    const sh = dv.shadow == null ? 0.5 : dv.shadow;
    if (sh > 0) {
      ctx.shadowColor = `rgba(0,0,0,${(0.5 * sh).toFixed(3)})`;
      ctx.shadowBlur = bodyW * 0.11 * sh * (opts.shadowScale || 1);
      ctx.shadowOffsetY = bodyW * 0.045 * sh * (opts.shadowScale || 1);
    }
    ctx.drawImage(src, -ocx, -ocy);
    ctx.restore();
    return { x: cx - bodyW / 2, y: top, w: bodyW, h: dev.bodyH, cx, cy, rot: dv.rot || 0 };
  }

  /**
   * Renders a slide. env: { frame: default frame for this size ('iphone'|'android'|'tablet'), getImage(id) }.
   * Returns hit boxes { device, text } in canvas pixels (used for dragging in the editor).
   */
  P.render = function (ctx, W, H, slide, env) {
    env = env || {};
    const ref = P.refFor(W, H);
    const s = Math.min(W / ref.w, H / ref.h);
    const ox = (W - ref.w * s) / 2, oy = (H - ref.h * s) / 2;
    const boxes = {};
    ctx.save();
    P.drawBackground(ctx, W, H, slide.bg, env.getImage);

    const back = P.drawBadges(ctx, slide, s, ox, oy, ref, env.getImage, true);
    const dv = slide.device;
    const type = dv.type === 'auto' ? env.frame || 'iphone' : dv.type;
    if (type !== 'hidden') {
      const tabletRef = ref.h < 1500;
      const factor = tabletRef && type !== 'tablet' ? 0.6 : 1;
      const bodyW = dv.scale * ref.w * s * factor;
      const img = slide.shot && env.getImage ? env.getImage(slide.shot) : null;
      boxes.device = placeDevice(ctx, dv, type, img, ox + dv.x * ref.w * s, oy + dv.y * ref.h * s, bodyW, {});
    }
    boxes.badges = back.concat(P.drawBadges(ctx, slide, s, ox, oy, ref, env.getImage, false));

    const t = slide.text;
    const maxW = ref.w * s * (t.width || 0.86);
    const lay = P.layoutText(ctx, t, s, maxW);
    const x = t.align === 'left' ? ox + ref.w * s * ((1 - (t.width || 0.86)) / 2) : t.align === 'right' ? ox + ref.w * s * (1 - (1 - (t.width || 0.86)) / 2) : ox + (ref.w * s) / 2;
    // keep the whole text block on the canvas (matters for wider sizes like iPad)
    const top = Math.min(oy + t.y * ref.h * s, H - lay.height - ref.h * s * 0.035);
    P.drawText(ctx, t, lay, x, top);
    // tight box around the lines actually drawn (used for selection outlines)
    let tw = 0;
    [lay.head, lay.sub].forEach((L) => L && L.lines.forEach((ln) => { tw = Math.max(tw, ln.w); }));
    tw = Math.max(tw, 40 * s);
    const bx = t.align === 'left' ? x : t.align === 'right' ? x - tw : x - tw / 2;
    const th = Math.max(lay.height, 10 * s);
    boxes.text = { x: bx, y: top, w: tw, h: th, cx: bx + tw / 2, cy: top + th / 2, rot: 0 };
    ctx.restore();
    boxes.scale = s;
    boxes.ref = ref;
    boxes.ox = ox;
    boxes.oy = oy;
    return boxes;
  };

  /** Google Play feature graphic (1024×500): first slide's background + headline on the left, device on the right. */
  P.renderFeature = function (ctx, W, H, slide, env) {
    env = env || {};
    ctx.save();
    P.drawBackground(ctx, W, H, slide.bg, env.getImage);
    const dv = slide.device;
    let type = dv.type === 'auto' || dv.type === 'tablet' ? 'android' : dv.type;
    const s = H / 1000;
    if (type !== 'hidden') {
      const img = slide.shot && env.getImage ? env.getImage(slide.shot) : null;
      placeDevice(ctx, { ...dv, rot: dv.rot || 0 }, type, img, W * 0.76, H * 0.15, H * 0.6, { shadowScale: 0.8 });
    }
    const t = { ...slide.text, align: 'left' };
    const maxW = W * 0.5;
    // shrink text until it fits the left half vertically
    let k = 1, lay;
    for (let i = 0; i < 12; i++) {
      lay = P.layoutText(ctx, t, s * k, maxW);
      if (lay.height <= H * 0.72) break;
      k *= 0.9;
    }
    P.drawText(ctx, t, lay, W * 0.07, (H - lay.height) / 2);
    ctx.restore();
  };

  /* ───────── PNG export (true RGB, no alpha channel — App Store rejects alpha) ───────── */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }
  P.canvasToPNG = async function (canvas) {
    if (typeof CompressionStream === 'undefined') {
      return new Promise((res) => canvas.toBlob(res, 'image/png'));
    }
    const W = canvas.width, H = canvas.height;
    const px = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    const stride = W * 3 + 1;
    const raw = new Uint8Array(stride * H);
    for (let y = 0; y < H; y++) {
      let di = y * stride, si = y * W * 4;
      raw[di++] = 1; // "Sub" filter
      let pr = 0, pg = 0, pb = 0;
      for (let x = 0; x < W; x++, si += 4, di += 3) {
        const r = px[si], g = px[si + 1], b = px[si + 2];
        raw[di] = (r - pr) & 255; raw[di + 1] = (g - pg) & 255; raw[di + 2] = (b - pb) & 255;
        pr = r; pg = g; pb = b;
      }
    }
    const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
    const ihdr = new Uint8Array(13);
    const hv = new DataView(ihdr.buffer);
    hv.setUint32(0, W); hv.setUint32(4, H);
    ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolour RGB
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    return new Blob([sig, chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))], { type: 'image/png' });
  };

  /** Renders a slide at a full export size and returns the canvas. */
  P.renderSize = function (slide, sizeKey, getImage) {
    if (sizeKey === 'feature') {
      const c = mkCanvas(P.FEATURE.w, P.FEATURE.h);
      P.renderFeature(c.getContext('2d'), c.width, c.height, slide, { getImage });
      return c;
    }
    const S = P.SIZES[sizeKey];
    const c = mkCanvas(S.w, S.h);
    P.render(c.getContext('2d'), S.w, S.h, slide, { frame: S.frame, getImage });
    return c;
  };
})();
