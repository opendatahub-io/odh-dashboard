/**
 * Exact-match helpers used by the Data Connect Hub page object.
 *
 * They live outside the page object so Jest can cover the matching rules without Cypress.
 * The connections table renders the name as a link and also shows the description, type, and
 * verification label in the same row, so a row lookup must match the name link itself. The
 * wizard renders each connection type as a card whose title is the displayed name and whose
 * radio is the only interactive element.
 */

const CARD_TITLE_SELECTOR = '[id$="-card-title"]';

/** True when a connection-type card's title is exactly the requested display name. */
export const connectionTypeCardMatches = (card: Element, name: string): boolean =>
  card.querySelector(CARD_TITLE_SELECTOR)?.textContent.trim() === name;

/** True when a connections-table row has a link whose text is exactly the connection name. */
export const connectionRowMatches = (row: Element, name: string): boolean =>
  Array.from(row.querySelectorAll('a')).some((link) => link.textContent.trim() === name);
