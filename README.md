# Fuel Consumption for Google Maps

A Chrome extension (Manifest V3) that adds a fuel estimate to Google Maps driving
directions. For every route option in the directions panel it shows how much fuel
the route needs and what that fuel costs:

```
2 h 14 min                    193 km
via D1
⛽ 13.5 l · 23.64 €
```

The same figure is also pinned onto each route drawn on the map, labelled with
the road names so alternatives can be told apart; the selected route's label is
highlighted.

You configure your car's average consumption and your local fuel price once; the
extension reads the route distance that Maps already renders and does the math.

TypeScript, no bundler, no runtime dependencies — plain ES modules and DOM APIs
compiled with `tsc`.

## Requirements

- Chrome 102+ (or any Chromium browser with Manifest V3 support)
- Node.js 20+ and npm — only to build; the extension itself ships no dependencies

## Install (load unpacked)

1. Install the build dependencies and build the extension:

   ```bash
   npm install && npm run build
   ```

   This produces the loadable extension in `dist/`.

2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked** and select the **`dist/`** folder of this repo —
   not the repo root, which has no `manifest.json`.
5. The options page opens on first install. Enter your average consumption and
   fuel price, then click **Save**.
6. Open [Google Maps](https://www.google.com/maps), get driving directions
   between two places, and the `⛽` line appears in each route card.

To update after pulling changes: run `npm run build` again, then press the
**reload** (↻) button on the extension's card in `chrome://extensions`.

## Development

```bash
npm install        # once
npm run watch      # rebuild dist/ on every change to src/ or public/
npm run build      # one-off build into dist/
npm test           # builds, then runs the unit tests against dist/
npm run typecheck  # tsc --noEmit, no output written
npm run package    # build, then zip dist/ for the Chrome Web Store
npm run clean      # remove dist/
```

The icons in `public/icons/` are tracked in git; regenerate them from an SVG with
`magick` if they ever change.

### The development loop

1. `npm run watch` in a terminal — it compiles `src/` with `tsc --watch` and
   recopies `public/` whenever a static file changes.
2. Load `dist/` unpacked once (see above).
3. After a change, reload the extension in `chrome://extensions`, then reload the
   Google Maps tab. Chrome does not hot-reload extensions, so both steps are needed:
   - changes to **popup / options** pages: just close and reopen the page
   - changes to the **content script**: reload the extension *and* the Maps tab
   - changes to the **service worker**: reload the extension

### Debugging

| Part | Where its console lives |
| --- | --- |
| Content script | DevTools on the Google Maps tab (logs are prefixed `[fuel-consumption]`) |
| Popup | Right-click the toolbar icon → **Inspect popup** |
| Options page | Open it, then F12 as usual |
| Service worker | `chrome://extensions` → **service worker** link on the extension card |

Source maps are emitted, so DevTools shows the original TypeScript.

Stored settings live in `chrome.storage.sync`; inspect them from any of the above
consoles with `chrome.storage.sync.get(console.log)`.

## Project layout

```
public/                  static files, copied verbatim into dist/
├── manifest.json        MV3 manifest
├── icons/               tracked PNGs
├── shared/tokens.css    colour tokens shared by popup + options
├── popup/               popup markup + styles
└── options/             options page markup + styles
src/
├── lib/                 shared logic (everything but form.ts is DOM-free)
│   ├── types.ts         Settings / Estimate shapes
│   ├── units.ts         distance parsing, unit constants
│   ├── fuel.ts          consumption conversion + the estimate itself
│   ├── route-geo.ts     directions parsing, Web Mercator projection, label placement
│   ├── format.ts        locale-aware number/label formatting
│   ├── settings.ts      chrome.storage access, defaults, validation
│   └── form.ts          bits shared by the popup and options UIs
├── content/             what runs inside Google Maps
│   ├── bootstrap.ts     classic-script entry, dynamic-imports main.js
│   ├── main.ts          lifecycle: load settings, observe DOM, refresh
│   ├── maps-dom.ts      finds route cards and their distances
│   ├── map-routes.ts    route geometry + where each map label goes
│   └── panel.ts         renders the injected estimates (cards + map)
├── background/
│   └── service-worker.ts  opens the options page on install
├── popup/popup.ts       quick consumption/price editing
└── options/options.ts   full settings form
scripts/                 build + packaging (plain Node)
tests/                   node:test suites, run against dist/ (npm test builds first)
```

The build output mirrors this: `src/content/main.ts` → `dist/content/main.js`, and
`public/popup/popup.html` → `dist/popup/popup.html`, so HTML and its compiled
script end up side by side.

### Why the content script has a bootstrap file

Content scripts declared in a manifest are *classic* scripts and cannot use
static `import`. `bootstrap.ts` therefore does one thing — dynamically imports
`content/main.js`, which is declared in `web_accessible_resources` — so the rest
of the code can be ordinary ES modules with no bundler in the picture.

## How the estimate is computed

1. `maps-dom.ts` finds each route container (`div[id^="section-directions-trip-"]`,
   `div[data-trip-index]`) and takes the **largest** distance-looking label inside
   it — the total is never smaller than an expanded turn-by-turn step.
2. `units.ts` parses that label into metres, handling `12,4 km`, `1,234 mi`,
   `850 m`, `200 yd`, `300 ft`, and both decimal separators.
3. `fuel.ts` converts your consumption to l/100 km, multiplies by the distance,
   and multiplies by the price per litre.

For the labels on the map, `map-routes.ts` re-reads the directions response Maps
just fetched (`/maps/preview/directions`, same origin) to get each route's
geometry, projects it with the viewport in the URL (`@lat,lng,zoomz`), and pins
each label where that route strays furthest from the others. Maps draws the
routes in a worker-owned canvas, so we overlay our own layer instead of drawing
into it. Labels hide while the map moves and return once the URL catches up;
tilted/rotated 3D views and satellite altitude views get no map labels.

It is a flat average-consumption model. Maps does not expose elevation, traffic
or driving style to extensions, so treat the number as a planning aid.

## Adapting it

**Other Google domains.** The content script is registered for a handful of
domains (`google.com`, `maps.google.com`, `google.cz`, `.sk`, `.de`, `.at`, `.pl`,
`.co.uk`). Match patterns cannot wildcard a TLD, so add your own to **both**
`content_scripts.matches` and `web_accessible_resources.matches` in
`public/manifest.json`.

**Maps changed its DOM.** Google obfuscates its class names, so the extension
relies only on ids and data attributes. If estimates stop appearing, the
selectors in `src/content/maps-dom.ts` (`ROUTE_CARD_SELECTORS`) are the single
place to fix.

**More vehicles, per-route consumption, CO₂.** The estimate is one pure function
(`estimate()` in `src/lib/fuel.ts`) over a `Settings` object, covered by tests —
extend it there rather than in the DOM code.

## Publishing

```bash
npm run package
```

Produces `fuel-consumption-extension-<version>.zip` from `dist/`, ready to upload
to the Chrome Web Store (requires the `zip` CLI). Bump `version` in **both**
`package.json` and `public/manifest.json` first.

## Privacy

No analytics, no tracking, and no requests to anyone but Google Maps itself: the
only request the extension makes is repeating Maps' own directions request once
per route change, to read the route geometry for the map labels. Settings are stored with
`chrome.storage.sync` (synced by your own Chrome profile). The only permission
requested is `storage`, plus host access to Google Maps pages.

## License

This project is licensed under the [MIT License](LICENSE).
