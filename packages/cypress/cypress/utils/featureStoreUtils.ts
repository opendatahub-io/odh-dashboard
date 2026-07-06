import { featureStoreGlobal } from '../pages/featureStore/featureStoreGlobal';

/**
 * Extracts the total count from pagination toggle button
 * Uses the reusable pagination finder from featureStoreGlobal
 * @returns {Cypress.Chainable<number>} The total count from pagination
 */
export const getTotalCountFromPagination = (): Cypress.Chainable<number> => {
  return featureStoreGlobal
    .findPaginationToggle()
    .then(($el) => {
      const paginationText = $el.text().trim();
      const match = paginationText.match(/of\s+(\d+)/);
      if (match && match[1]) {
        const count = parseInt(match[1], 10);
        return cy.wrap<number>(count);
      }
      throw new Error(
        `Could not extract total count from pagination toggle text: ${paginationText}`,
      );
    })
    .then((count) => count);
};

/**
 * Asserts that the pagination shows the expected total count
 * @param {number} expectedCount - The expected total count
 * @returns {Cypress.Chainable<number>} Chainable that resolves to the actual count
 */
export const shouldHaveTotalCount = (expectedCount: number): Cypress.Chainable<number> => {
  return getTotalCountFromPagination().then((actualCount) => {
    expect(actualCount).to.equal(expectedCount);
    return cy.wrap(actualCount);
  });
};
