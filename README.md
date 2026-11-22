# Paneful

Free App Store and Google Play screenshot maker that runs entirely in the browser.
No backend, no database, no login, and no build step: just HTML, CSS and JavaScript.

## Try it

**Quickest:** double-click `index.html` (landing page) or `app/index.html` (editor).

**Best (like a real website):** run a tiny local server in this folder, then open http://localhost:8000

```
python -m http.server 8000
```
or
```
npx serve .
```

## Put it online for free

Any static host works. Upload this whole folder as-is:

- **Cloudflare Pages:** Workers & Pages → Create → Pages → Upload assets → drag this folder in.
- **Netlify:** app.netlify.com/drop → drag this folder in.
- **Vercel / GitHub Pages:** push the folder to a repo and deploy it as a static site (no build command, output = root).

## What's in the folder

```
index.html              Landing page
app/index.html          The editor
assets/
  css/base.css          Colours, fonts and buttons shared by both pages
  css/app.css           Editor styles
  css/landing.css       Landing page styles
  css/fonts.css         @font-face rules for the 16 bundled fonts
  js/engine.js          Renderer: backgrounds, text, device frames, 3D tilt, export sizes, RGB PNG encoder
  js/themes.js          53 themes × 3 colourways (159 looks), 12 categories, slide data model
  js/demo.js            Draws the demo "Bloom" app screens (no image files needed)
  js/app.js             Editor: slides, panels, selection handles, undo/redo, autosave, export
  js/extras.js          Store preview, pre-flight check, match-my-colours
  js/landing.js         Draws the landing page previews with the same engine
  fonts/                Self-hosted fonts (all SIL Open Font License)
  lib/jszip.min.js      JSZip 3.10 (MIT) for building the ZIP
  img/                  Logo, favicon, apple-touch-icon, social preview image (og.png)
```

## How it works

- **Rendering:** each slide is drawn on an HTML canvas. Layout is designed in a 1000-unit-wide reference box,
  then scaled to fit each export size, so one design works at every size.
- **Device frames** are drawn in code (no image files), so they're sharp at any resolution.
- **3D tilt** is a small WebGL perspective pass in `engine.js`.
- **Export:** PNGs are encoded as true RGB with no alpha channel (App Store Connect rejects alpha),
  then zipped with JSZip, with one folder per store and size.
- **Saving:** the project autosaves to the browser's IndexedDB. Images are stored as blobs there too.
  "Save project file" in the ⋯ menu downloads a `.json` backup with the images embedded.

## Brand

| Token | Hex |
|---|---|
| Ink (background) | `#0B0B0C` |
| Panel | `#141416` |
| Line | `#26262A` |
| Text | `#EDEDEF` |
| Muted | `#8A8A93` |
| Paper (light buttons) | `#F2F1EE` |
| **Sage (accent)** | `#7FA88A` |

Fonts: Geist (UI) and Instrument Serif (headlines).

## Themes

`assets/js/themes.js` builds every theme from four parts:

- **Layout style** (`ARCH`): glow, aurora, editorial, poster, split, tilt, chat, proof, minimal, pattern, sunrise, bare.
  Each decides the background effects, where the phone sits and which elements float around it.
- **Font pairing** (`FP`): a headline font plus an accent font for words in *stars* (often an italic serif).
- **Colourways** (`PAL`): three colours each (background, background 2, accent). Text and badge colours are worked out automatically for contrast.
- **Category copy** (`COPY`): sample text for the chips, bubbles, ratings, awards, stats and reviews.

To add a theme, add one line to `ROWS`:

```js
['myTheme', 'My Theme', 'productivity', 'glow', 0, 'font', ['violet', 'sky', 'ember']],
//  id        name        category        style  fonts accent  3 colourways from PAL
```

Accent mode: `'font'` = accent words use the accent font, `'color'` = they use the accent colour, `'both'` = both.

## Elements

Chips, speech bubbles, star ratings, awards (laurels), stat cards, review cards and sparkles are all drawn in code
(`drawBadge` in `engine.js`), so they stay sharp at every export size. In the editor they're under **Elements**:
add, edit, drag, resize, rotate and delete them per slide.

## Export sizes

| Store | Size | Pixels |
|---|---|---|
| App Store | iPhone 6.9″ | 1320 × 2868 |
| App Store | iPhone 6.5″ | 1284 × 2778 |
| App Store | iPad 13″ | 2064 × 2752 |
| Google Play | Phone | 1080 × 1920 |
| Google Play | Tablet | 1440 × 2560 |
| Google Play | Feature graphic | 1024 × 500 |

Store requirements change from time to time; the sizes live in `P.SIZES` at the top of `assets/js/engine.js`.

## Extras (no AI, no network)

- **Store preview** (top bar → Preview): your slides inside approximate App Store and Google Play layouts,
  search results and app page, light and dark. App name, subtitle, developer, rating and icon are editable
  and saved with the project.
- **Thumbnail test** (Preview → Thumbnail test): your slides at real search-result size between other apps, for the
  App Store (first 3) and Google Play (first 4), light or dark, with a “quick glance” blur. Each slide gets a
  stand-out score from headline size, contrast, how different it looks from its neighbours and how much its edges
  stand out from the store page, plus hints. Click a slide's score to jump to it.
- **Pre-flight check** (top bar → Check, also shown in Export): flags headlines that are too small for search
  results, low text contrast, text running into the phone, cut-off text, elements outside the image or covering
  the headline, missing screenshots and long headlines. Most come with a one-click fix, and “Fix all” is undoable.
- **Match my app’s colours** (Themes panel): finds the main colours in your screenshots (a hue histogram over the
  saturated pixels) and builds Deep, Soft and Bold colourways for the current theme.
