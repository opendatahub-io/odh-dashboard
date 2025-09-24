/**
 * Gets entity count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getEntityCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/entities?project=${project}&allow_cache=true&include_relationships=false`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Entity Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Entity count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Entity count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('entities' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'entities' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for entity count: Missing 'entities' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.entities.length;
      cy.log(`Entity count via API: ${count}`);
      cy.wrap(count).as('entityCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getEntityCount: ${errorMessage}`);
      throw new Error(`Failed to get entity count from ${apiUrl}: ${errorMessage}`);
    }
  });
};

/**
 * Gets feature count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getFeatureCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/features?project=${project}&include_relationships=false&allow_cache=true`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Feature Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Feature count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Feature count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('features' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'features' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for feature count: Missing 'features' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.features.length;
      cy.log(`Feature count via API: ${count}`);
      cy.wrap(count).as('featureCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getFeatureCount: ${errorMessage}`);
      throw new Error(`Failed to get feature count from ${apiUrl}: ${errorMessage}`);
    }
  });
};

/**
 * Gets feature view count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getFeatureViewCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/feature_views?project=${project}&allow_cache=true&include_relationships=false`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Feature View Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Feature view count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Feature view count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('featureViews' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'featureViews' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for feature view count: Missing 'featureViews' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.featureViews.length;
      cy.log(`Feature view count via API: ${count}`);
      cy.wrap(count).as('featureViewCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getFeatureViewCount: ${errorMessage}`);
      throw new Error(`Failed to get feature view count from ${apiUrl}: ${errorMessage}`);
    }
  });
};

/**
 * Gets feature service count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getFeatureServiceCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/feature_services?project=${project}&include_relationships=false&allow_cache=true`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Feature Service Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Feature service count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Feature service count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('featureServices' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'featureServices' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for feature service count: Missing 'featureServices' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.featureServices.length;
      cy.log(`Feature service count via API: ${count}`);
      cy.wrap(count).as('featureServiceCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getFeatureServiceCount: ${errorMessage}`);
      throw new Error(`Failed to get feature service count from ${apiUrl}: ${errorMessage}`);
    }
  });
};

/**
 * Gets data source count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getDataSourceCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/data_sources?project=${project}&include_relationships=false&allow_cache=true`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Data Source Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Data source count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Data source count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('dataSources' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'dataSources' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for data source count: Missing 'dataSources' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.dataSources.length;
      cy.log(`Data source count via API: ${count}`);
      cy.wrap(count).as('dataSourceCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getDataSourceCount: ${errorMessage}`);
      throw new Error(`Failed to get data source count from ${apiUrl}: ${errorMessage}`);
    }
  });
};

/**
 * Gets saved dataset count via Feature Store REST API and stores it as alias
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {string} project - The project name
 */
export const getSavedDatasetCount = (routeUrl: string, project: string): void => {
  const apiUrl = `${routeUrl}/api/v1/saved_datasets?project=${project}&allow_cache=true&include_relationships=false`;

  cy.request({
    method: 'GET',
    url: apiUrl,
    headers: { accept: 'application/json' },
    failOnStatusCode: false,
  }).then((response) => {
    try {
      // Log the API call details
      cy.log(`Saved Dataset Count API Call: ${apiUrl}`);
      cy.log(`Response Status: ${response.status}`);

      if (response.status !== 200) {
        cy.log(`ERROR: Saved dataset count API failed with status ${response.status}`);
        cy.log(`Response Body: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Saved dataset count API failed: ${response.status} - ${
            response.statusText
          }. Response: ${JSON.stringify(response.body)}`,
        );
      }

      if (!response.body || !('savedDatasets' in response.body)) {
        cy.log(`ERROR: Invalid response structure. Expected 'savedDatasets' property.`);
        cy.log(`Actual Response: ${JSON.stringify(response.body, null, 2)}`);
        throw new Error(
          `Invalid response structure for saved dataset count: Missing 'savedDatasets' property. Response: ${JSON.stringify(
            response.body,
          )}`,
        );
      }

      const count = response.body.savedDatasets.length;
      cy.log(`Saved dataset count via API: ${count}`);
      cy.wrap(count).as('savedDatasetCount');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`FATAL ERROR in getSavedDatasetCount: ${errorMessage}`);
      throw new Error(`Failed to get saved dataset count from ${apiUrl}: ${errorMessage}`);
    }
  });
};
