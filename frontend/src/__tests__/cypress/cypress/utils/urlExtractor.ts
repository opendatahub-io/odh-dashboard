/**
 * Extracts URLs from all anchor elements on the current page.
 * This function finds all 'a' elements, extracts their 'href' attributes,
 * and returns them as an array of strings.
 *
 * @returns {Cypress.Chainable<string[]>} A Cypress chainable that resolves to an array of URLs.
 */
export function extractLauncherUrls(): Cypress.Chainable<string[]> {
  return cy.get('a').then(($elements) => {
    const extractedUrls: string[] = [];
    $elements.each((_, el) => {
      const href = Cypress.$(el).attr('href');
      if (href) {
        extractedUrls.push(href);
      }
    });
    return extractedUrls;
  });
}
