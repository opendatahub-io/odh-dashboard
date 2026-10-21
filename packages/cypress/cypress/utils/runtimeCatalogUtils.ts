const RUNTIME_CATALOG_LIST_ALIAS = 'runtimeCatalogList';

/**
 * Spies on the Runtime image library list request without stubbing it, so the live
 * backend still answers. Register it right before the action whose request you
 * want to inspect, since the first matching request after this call is the one
 * `verifyRuntimeCatalogListFilteredByHardware` reads.
 */
export const interceptRuntimeCatalogList = (): void => {
  cy.intercept({
    method: 'GET',
    pathname: /\/serving_runtime_catalog\/serving_runtimes$/,
  }).as(RUNTIME_CATALOG_LIST_ALIAS);
};

/**
 * Verifies that the next Runtime image library list request filters on exactly the
 * given hardware value, with no other filters applied. Which runtimes match is up to
 * the catalog backend; this checks that the dashboard sends the selected filter.
 */
export const verifyRuntimeCatalogListFilteredByHardware = (hardware: string): void => {
  // The UI's hardware filter maps to the catalog field capabilities.supportedAccelerators. A single
  // selected value is sent as an equality clause, with single quotes doubled.
  const expectedFilterQuery = `capabilities.supportedAccelerators='${hardware.replace(
    /'/g,
    "''",
  )}'`;
  cy.wait(`@${RUNTIME_CATALOG_LIST_ALIAS}`)
    .its('request.url')
    .then((url: string) => {
      const filterQuery = new URL(url).searchParams.get('filterQuery');
      expect(filterQuery, 'runtime list filterQuery').to.equal(expectedFilterQuery);
    });
};
