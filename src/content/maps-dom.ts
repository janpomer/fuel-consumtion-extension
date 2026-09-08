import { parseDistance } from '../lib/units.js';

export interface RouteCard {
  /** The Google Maps route container we attach our estimate to. */
  element: HTMLElement;
  /** Total route distance in metres, as rendered by Google Maps. */
  distanceMeters: number;
}

/**
 * Containers Google Maps uses for a single route option. Class names in Maps
 * are obfuscated and change often, so we only rely on ids and data attributes,
 * which have been stable for years.
 */
const ROUTE_CARD_SELECTOR = 'div[id^="section-directions-trip-"], div[data-trip-index]';

/** Labels longer than this are prose, not a distance such as "12,4 km". */
const MAX_LABEL_LENGTH = 40;

/** True while the directions panel is open (Maps is a single-page app). */
export function isDirectionsView(): boolean {
  return location.pathname.includes('/maps/dir');
}

/**
 * True when the selected travel mode is driving. Maps encodes the mode in the
 * URL as `!3e<n>`: 0 driving, 1 cycling, 2 walking, 3 transit, 4 flight.
 * A missing marker means the default, which is driving.
 */
export function isDrivingMode(): boolean {
  const match = /!3e(\d)/.exec(location.href);
  return match === null || match[1] === '0';
}

/**
 * Every route option currently listed, with its total distance.
 *
 * When both selectors match nested elements of the same route, only the
 * outermost is kept, so a route never receives two estimates.
 */
export function findRouteCards(): RouteCard[] {
  const cards: RouteCard[] = [];

  for (const element of document.querySelectorAll<HTMLElement>(ROUTE_CARD_SELECTOR)) {
    if (element.parentElement?.closest(ROUTE_CARD_SELECTOR)) continue;

    const distanceMeters = extractDistance(element);
    if (distanceMeters !== null) cards.push({ element, distanceMeters });
  }

  return cards;
}

/**
 * Finds the route's total distance inside a card.
 *
 * A card may also contain per-step distances once the turn-by-turn list is
 * expanded, so we take the largest value found: the total is never smaller
 * than any of its steps.
 */
export function extractDistance(card: HTMLElement): number | null {
  let best: number | null = null;

  for (const text of distanceCandidates(card)) {
    const meters = parseDistance(text);
    if (meters !== null && (best === null || meters > best)) best = meters;
  }

  return best;
}

/**
 * Text worth testing for a distance: every element whose whole text is short
 * enough to be a single label (so `"12,4 km"` is found even when Maps splits it
 * across inline spans), plus bare text nodes.
 */
function* distanceCandidates(card: HTMLElement): Generator<string> {
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isOurs(node)) return NodeFilter.FILTER_REJECT;
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      return isShortLabel(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  while (walker.nextNode()) {
    const text = walker.currentNode.textContent;
    if (isShortLabel(text)) yield text;
  }
}

function isShortLabel(text: string | null): text is string {
  return text !== null && text.length > 0 && text.length <= MAX_LABEL_LENGTH;
}

function isOurs(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest('.fce-estimate') != null;
}
