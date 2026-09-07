const STYLE_ID = 'fce-styles';
const PANEL_CLASS = 'fce-estimate';

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

/** Removes every estimate we have injected. */
export function removeAllEstimates(): void {
  for (const panel of document.querySelectorAll(`.${PANEL_CLASS}`)) panel.remove();
}
