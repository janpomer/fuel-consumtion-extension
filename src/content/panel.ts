const STYLE_ID = 'fce-styles';
const PANEL_CLASS = 'fce-estimate';
const MAP_LAYER_CLASS = 'fce-map-labels';

export interface MapLabel {
  x: number;
  y: number;
  title: string;
  text: string;
  selected: boolean;
}

/** Injects our stylesheet once per page. */
export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${PANEL_CLASS} {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 4px 0 8px;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(26, 115, 232, 0.08);
      color: #1a73e8;
      font: 500 12px/1.4 Roboto, Arial, sans-serif;
      white-space: nowrap;
      cursor: default;
    }
    .${PANEL_CLASS}__icon {
      font-size: 13px;
      line-height: 1;
    }
    .${PANEL_CLASS}__value {
      font-weight: 600;
    }
    .${MAP_LAYER_CLASS} {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .${MAP_LAYER_CLASS}__pill {
      position: absolute;
      display: flex;
      flex-direction: column;
      max-width: 180px;
      transform: translate(-50%, 10px);
      padding: 3px 10px;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      color: #5f6368;
      font: 500 11px/1.35 Roboto, Arial, sans-serif;
      white-space: nowrap;
    }
    .${MAP_LAYER_CLASS}__pill > span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .${MAP_LAYER_CLASS}__pill > span:last-child {
      font-weight: 700;
      font-size: 12px;
    }
    .${MAP_LAYER_CLASS}__pill--selected {
      z-index: 1;
      background: #1a73e8;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      color: #fff;
      font-size: 12px;
    }
    .${MAP_LAYER_CLASS}__pill--selected > span:last-child {
      font-size: 13px;
    }
    .${MAP_LAYER_CLASS}__stop {
      position: absolute;
      z-index: 2;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%);
      border: 2px solid #ea4335;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      font-size: 13px;
      line-height: 1;
    }
    @media (prefers-color-scheme: dark) {
      .${PANEL_CLASS} {
        background: rgba(138, 180, 248, 0.14);
        color: #8ab4f8;
      }
    }
  `;
  (document.head ?? document.documentElement).appendChild(style);
}

/** Creates or updates the estimate line inside a route card. */
export function renderEstimate(card: HTMLElement, value: string, tooltip: string): void {
  let panel = card.querySelector<HTMLElement>(`:scope > .${PANEL_CLASS}`);

  if (!panel) {
    panel = document.createElement('div');
    panel.className = PANEL_CLASS;
    panel.setAttribute('role', 'note');

    const icon = document.createElement('span');
    icon.className = `${PANEL_CLASS}__icon`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⛽';

    const text = document.createElement('span');
    text.className = `${PANEL_CLASS}__value`;

    panel.append(icon, text);
    card.appendChild(panel);
  }

  const text = panel.querySelector<HTMLElement>(`.${PANEL_CLASS}__value`);
  if (text && text.textContent !== value) text.textContent = value;
  if (panel.title !== tooltip) panel.title = tooltip;
}

/**
 * Pins one estimate pill per route, plus a marker per refuelling stop, onto the
 * map. The layer sits inside the map container, so the directions sidebar still
 * covers it like it covers the map.
 */
export function renderMapLabels(map: HTMLElement, labels: MapLabel[], stops: [x: number, y: number][]): void {
  let layer = map.querySelector<HTMLElement>(`:scope > .${MAP_LAYER_CLASS}`);

  if (!layer) {
    layer = document.createElement('div');
    layer.className = MAP_LAYER_CLASS;
    // Same figures as the route cards in the sidebar, which screen readers get.
    layer.setAttribute('aria-hidden', 'true');
    map.appendChild(layer);
  }

  // Skipping unchanged renders also keeps our own mutations from re-triggering refresh.
  const key = JSON.stringify([labels, stops]);
  if (layer.dataset.key === key) return;
  layer.dataset.key = key;

  layer.replaceChildren(
    ...labels.map(({ x, y, title, text, selected }) => {
      const pill = document.createElement('div');
      pill.className = `${MAP_LAYER_CLASS}__pill${selected ? ` ${MAP_LAYER_CLASS}__pill--selected` : ''}`;
      pill.style.left = `${x}px`;
      pill.style.top = `${y}px`;

      const road = document.createElement('span');
      road.textContent = title;
      const value = document.createElement('span');
      value.textContent = `⛽ ${text}`;
      pill.append(...(title ? [road] : []), value);
      return pill;
    }),
    ...stops.map(([x, y]) => {
      const stop = document.createElement('div');
      stop.className = `${MAP_LAYER_CLASS}__stop`;
      stop.style.left = `${x}px`;
      stop.style.top = `${y}px`;
      stop.textContent = '⛽';
      return stop;
    }),
  );
}

/** Removes every estimate we have injected. */
export function removeAllEstimates(): void {
  for (const panel of document.querySelectorAll(`.${PANEL_CLASS}, .${MAP_LAYER_CLASS}`)) panel.remove();
}
