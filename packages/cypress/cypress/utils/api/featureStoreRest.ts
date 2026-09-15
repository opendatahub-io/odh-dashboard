/**
 * Gets the OpenShift Bearer token from the current oc session.
 * Required for Feast REST API calls when Kubernetes auth is enabled.
 *
 * @returns {Cypress.Chainable<string>} The Bearer token
 */
export const getOCToken = (): Cypress.Chainable<string> => {
  return cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((result) => {
    if (!result.stdout.trim()) {
      throw new Error(`Failed to get OC token: ${result.stderr}`);
    }
    return cy.wrap(result.stdout.trim(), { log: false });
  });
};

/**
 * Builds the authorization headers for Feast REST API requests.
 */
const authHeaders = (token: string): Record<string, string> => ({
  accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

/**
 * Gets entity count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The entity count
 */
export const getEntityCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/entities?project=${project}&allow_cache=true&include_relationships=false`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('entities' in response.body)) {
        throw new Error(`Failed to get entity count: ${response.status}`);
      }
      const count = response.body.entities.length;
      cy.log(`Entity count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets feature count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The feature count
 */
export const getFeatureCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/features?project=${project}&include_relationships=false&allow_cache=true`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('features' in response.body)) {
        throw new Error(`Failed to get feature count: ${response.status}`);
      }
      const count = response.body.features.length;
      cy.log(`Feature count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets feature view count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The feature view count
 */
export const getFeatureViewCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/feature_views?project=${project}&allow_cache=true&include_relationships=false`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('featureViews' in response.body)) {
        throw new Error(`Failed to get feature view count: ${response.status}`);
      }
      const count = response.body.featureViews.length;
      cy.log(`Feature view count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets feature service count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The feature service count
 */
export const getFeatureServicesCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/feature_services?project=${project}&include_relationships=false&allow_cache=true`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('featureServices' in response.body)) {
        throw new Error(`Failed to get feature service count: ${response.status}`);
      }
      const count = response.body.featureServices.length;
      cy.log(`Feature service count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets data source count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The data source count
 */
export const getDataSourceCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/data_sources?project=${project}&include_relationships=false&allow_cache=true`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('dataSources' in response.body)) {
        throw new Error(`Failed to get data source count: ${response.status}`);
      }
      const count = response.body.dataSources.length;
      cy.log(`Data source count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets saved dataset count and returns it
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @param {string} token - The Bearer token for authentication
 * @returns {Cypress.Chainable<number>} The saved dataset count
 */
export const getDatasetsCount = (
  routeUrl: string,
  project: string,
  token: string,
): Cypress.Chainable<number> => {
  const apiUrl = `${routeUrl}/api/v1/saved_datasets?project=${project}&allow_cache=true&include_relationships=false`;

  return cy
    .request({
      method: 'GET',
      url: apiUrl,
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200 || !response.body || !('savedDatasets' in response.body)) {
        throw new Error(`Failed to get dataset count: ${response.status}`);
      }
      const count = response.body.savedDatasets.length;
      cy.log(`Saved dataset count: ${count}`);
      return cy.wrap<number>(count);
    });
};

type MetricsCounts = {
  featureCount: number;
  entityCount: number;
  datasetCount: number;
  dataSourceCount: number;
  featureViewCount: number;
  featureServiceCount: number;
};

/**
 * Fetches resource counts from the metrics endpoint (same source the dashboard overview cards use).
 * Retries while entity or dataset count is zero, to allow the registry cache to propagate
 * after feast apply and saved-dataset creation.
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 * @returns {Cypress.Chainable<MetricsCounts>} Object containing all counts from the metrics endpoint
 */
export const getMetricsResourceCounts = (
  routeUrl: string,
  project: string,
): Cypress.Chainable<MetricsCounts> => {
  const apiUrl = `${routeUrl}/api/v1/metrics/resource_counts?project=${encodeURIComponent(
    project,
  )}`;

  const fetchOnce = (token: string): Cypress.Chainable<MetricsCounts> =>
    cy
      .request({
        method: 'GET',
        url: apiUrl,
        headers: authHeaders(token),
        failOnStatusCode: false,
      })
      .then((response) => {
        if (response.status !== 200 || !response.body || !('counts' in response.body)) {
          throw new Error(`Failed to get metrics resource counts: ${response.status}`);
        }
        const { counts } = response.body;
        if (typeof counts !== 'object' || counts === null) {
          throw new Error(`Unexpected metrics response shape: ${JSON.stringify(counts)}`);
        }
        const nonNumeric = [
          'features',
          'entities',
          'savedDatasets',
          'dataSources',
          'featureViews',
          'featureServices',
        ].filter((key) => typeof counts[key] !== 'number');
        if (nonNumeric.length > 0) {
          throw new Error(
            `Unexpected metrics response shape (missing or non-numeric: ${nonNumeric.join(
              ', ',
            )}): ${JSON.stringify(counts)}`,
          );
        }
        return cy.wrap<MetricsCounts>({
          featureCount: counts.features,
          entityCount: counts.entities,
          datasetCount: counts.savedDatasets,
          dataSourceCount: counts.dataSources,
          featureViewCount: counts.featureViews,
          featureServiceCount: counts.featureServices,
        });
      });

  return getOCToken().then((token) => {
    const poll = (attempt: number, maxAttempts: number): Cypress.Chainable<MetricsCounts> =>
      fetchOnce(token).then((counts) => {
        const pending = [
          counts.entityCount === 0 ? 'entity' : null,
          counts.datasetCount === 0 ? 'dataset' : null,
        ].filter(Boolean);

        if (pending.length > 0 && attempt < maxAttempts) {
          cy.log(
            `Metrics ${pending.join(' and ')} count still 0; ` +
              `retry ${attempt}/${maxAttempts} (cache propagation)`,
          );
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          return cy.wait(2000).then(() => poll(attempt + 1, maxAttempts));
        }
        cy.log(`Metrics resource counts fetched: ${JSON.stringify(counts)}`);
        return cy.wrap(counts);
      });

    return poll(1, 5);
  });
};

/**
 * Features are derived from feature views. Right after registry apply the
 * registry-rest cache can return feature views without schemas, so /features is
 * empty while /feature_views is not. Retry until the two agree or attempts run out.
 */
const fetchFeatureCountWithRetry = (
  routeUrl: string,
  project: string,
  token: string,
  featureViewCount: number,
  attempt = 1,
  maxAttempts = 5,
): Cypress.Chainable<number> => {
  return getFeatureCount(routeUrl, project, token).then((featuresCount) => {
    if (featuresCount === 0 && featureViewCount > 0 && attempt < maxAttempts) {
      cy.log(
        `Feature count still 0 with ${featureViewCount} feature views; retry ${attempt}/${maxAttempts}`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy
        .wait(1000)
        .then(() =>
          fetchFeatureCountWithRetry(
            routeUrl,
            project,
            token,
            featureViewCount,
            attempt + 1,
            maxAttempts,
          ),
        );
    }
    return cy.wrap(featuresCount);
  });
};

/**
 * Fetches all Feature Store counts from individual list endpoints (for page pagination validation)
 * @param {string} routeUrl - The route URL for the API
 * @param {string} project - The project name
 * @returns {Cypress.Chainable<object>} Object containing all counts
 */
export const getAllFeatureStoreCounts = (
  routeUrl: string,
  project: string,
): Cypress.Chainable<{
  featureCount: number;
  entityCount: number;
  datasetCount: number;
  dataSourceCount: number;
  featureViewCount: number;
  featureServiceCount: number;
}> => {
  return getOCToken().then((token) => {
    return getFeatureViewCount(routeUrl, project, token).then((featureViewsCount) => {
      return fetchFeatureCountWithRetry(routeUrl, project, token, featureViewsCount).then(
        (featuresCount) => {
          return getEntityCount(routeUrl, project, token).then((entitiesCount) => {
            return getDatasetsCount(routeUrl, project, token).then((datasetsCount) => {
              return getDataSourceCount(routeUrl, project, token).then((dataSourcesCount) => {
                return getFeatureServicesCount(routeUrl, project, token).then(
                  (featureServicesCount) => {
                    const allCounts = {
                      featureCount: featuresCount,
                      entityCount: entitiesCount,
                      datasetCount: datasetsCount,
                      dataSourceCount: dataSourcesCount,
                      featureViewCount: featureViewsCount,
                      featureServiceCount: featureServicesCount,
                    };

                    cy.log('All Feature Store counts fetched:', allCounts);
                    return cy.wrap(allCounts);
                  },
                );
              });
            });
          });
        },
      );
    });
  });
};
