/**
 * Gets the OpenShift Bearer token from the current oc session.
 * Required for Feast REST API calls when Kubernetes auth is enabled.
 *
 * @returns {Cypress.Chainable<string>} The Bearer token
 */
export const getOCToken = (): Cypress.Chainable<string> => {
  return cy.exec('oc whoami -t', { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0 || !result.stdout.trim()) {
      throw new Error(`Failed to get OC token: ${result.stderr}`);
    }
    return cy.wrap(result.stdout.trim());
  });
};

/**
 * Builds the authorization headers for Feast REST API requests.
 */
const authHeaders = (
  token: string,
  extra: Record<string, string> = {},
): Record<string, string> => ({
  accept: 'application/json',
  Authorization: `Bearer ${token}`,
  ...extra,
});

export type CreateSavedDatasetOptions = {
  name: string;
  project: string;
  storagePath: string;
  storageType?: string;
  featureServiceName?: string;
  features?: string[];
  joinKeys?: string[];
  allowOverride?: boolean;
};

/**
 * Registers a saved dataset via the Feast Registry REST API (POST /saved_datasets).
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {CreateSavedDatasetOptions} options - Dataset registration payload
 * @returns {Cypress.Chainable<string>} The created dataset name
 */
export const createSavedDataset = (
  routeUrl: string,
  options: CreateSavedDatasetOptions,
): Cypress.Chainable<string> => {
  const apiUrl = `${routeUrl}/api/v1/saved_datasets`;

  return getOCToken().then((token) => {
    return cy
      .request({
        method: 'POST',
        url: apiUrl,
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: {
          /* eslint-disable camelcase -- Feast Registry REST API expects snake_case fields */
          name: options.name,
          project: options.project,
          storage_path: options.storagePath,
          storage_type: options.storageType ?? 'file',
          feature_service_name: options.featureServiceName,
          features: options.features ?? [],
          join_keys: options.joinKeys ?? [],
          allow_override: options.allowOverride ?? true,
          /* eslint-enable camelcase */
        },
        failOnStatusCode: false,
      })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(
            `Failed to create saved dataset "${options.name}": ${response.status} ${JSON.stringify(
              response.body,
            )}`,
          );
        }
        cy.log(`Created saved dataset: ${options.name} in project ${options.project}`);
        return cy.wrap<string>(options.name);
      });
  });
};

/**
 * Feast object types matching:
 * WITHOUT_DATA_SOURCE = [Project, Entity, FeatureService, SavedDataset] + ALL_FEATURE_VIEW_TYPES
 */
export const FEAST_AUTH_PERMISSION_TYPES = [
  'PROJECT',
  'ENTITY',
  'FEATURE_SERVICE',
  'SAVED_DATASET',
  'FEATURE_VIEW',
  'ON_DEMAND_FEATURE_VIEW',
  'BATCH_FEATURE_VIEW',
  'STREAM_FEATURE_VIEW',
  'LABEL_VIEW',
] as const;

/**
 * Actions matching: [AuthzedAction.DESCRIBE] + READ
 */
export const FEAST_AUTH_PERMISSION_ACTIONS = ['DESCRIBE', 'READ_OFFLINE', 'READ_ONLINE'] as const;

export type ApplyFeastPermissionOptions = {
  name?: string;
  project: string;
  namespaces: string[];
  types?: string[];
  actions?: string[];
};

/**
 * Applies a Feast permission via the Registry REST API (POST /permissions).
 * Defaults to a NamespaceBasedPolicy with DESCRIBE + READ on non-DataSource types.
 *
 * @param {string} routeUrl - The Feature Store route URL
 * @param {ApplyFeastPermissionOptions} options - Permission payload
 * @returns {Cypress.Chainable<string>} The applied permission name
 */
export const applyFeastPermission = (
  routeUrl: string,
  options: ApplyFeastPermissionOptions,
): Cypress.Chainable<string> => {
  const permissionName = options.name ?? 'feast-auth';
  const apiUrl = `${routeUrl}/api/v1/permissions`;

  return getOCToken().then((token) => {
    return cy
      .request({
        method: 'POST',
        url: apiUrl,
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: {
          name: permissionName,
          project: options.project,
          types: options.types ?? [...FEAST_AUTH_PERMISSION_TYPES],
          actions: options.actions ?? [...FEAST_AUTH_PERMISSION_ACTIONS],
          policy: {
            /* eslint-disable camelcase -- Feast Registry REST API expects snake_case fields */
            namespace_based_policy: {
              namespaces: options.namespaces,
            },
            /* eslint-enable camelcase */
          },
        },
        failOnStatusCode: false,
      })
      .then((response) => {
        if (response.status !== 200 && response.status !== 201) {
          throw new Error(
            `Failed to apply permission "${permissionName}": ${response.status} ${JSON.stringify(
              response.body,
            )}`,
          );
        }
        cy.log(
          `Applied permission: ${permissionName} for namespaces ${options.namespaces.join(', ')}`,
        );
        return cy.wrap<string>(permissionName);
      });
  });
};

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
        throw new Error(
          `Failed to get entity count: ${response.status} ${JSON.stringify(response.body)}`,
        );
      }
      const count = response.body.entities.length;
      cy.log(`Entity count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Gets feature count  and returns it
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
        throw new Error(
          `Failed to get feature count: ${response.status} ${JSON.stringify(response.body)}`,
        );
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
        throw new Error(
          `Failed to get feature view count: ${response.status} ${JSON.stringify(response.body)}`,
        );
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
        throw new Error(
          `Failed to get feature service count: ${response.status} ${JSON.stringify(
            response.body,
          )}`,
        );
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
        throw new Error(
          `Failed to get data source count: ${response.status} ${JSON.stringify(response.body)}`,
        );
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
        throw new Error(
          `Failed to get dataset count: ${response.status} ${JSON.stringify(response.body)}`,
        );
      }
      const count = response.body.savedDatasets.length;
      cy.log(`Saved dataset count: ${count}`);
      return cy.wrap<number>(count);
    });
};

/**
 * Fetches all Feature Store counts in a single function call
 * @param {string} routeUrl - The route URL for the API
 * @param {string} project - The project name
 * @returns {Cypress.Chainable<object>} Object containing all counts
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
    // Features are derived from feature views. Right after registry apply the
    // registry-rest cache can briefly return feature views without schemas,
    // so /features is empty while /feature_views is not. Retry until consistent.
    if (featuresCount === 0 && featureViewCount > 0 && attempt < maxAttempts) {
      cy.log(
        `Feature count still 0 with ${featureViewCount} feature views; retry ${attempt}/${maxAttempts}`,
      );
      // Retry without sleeping — allow_cache=true forces a fresh registry read.
      return fetchFeatureCountWithRetry(
        routeUrl,
        project,
        token,
        featureViewCount,
        attempt + 1,
        maxAttempts,
      );
    }
    return cy.wrap(featuresCount);
  });
};

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
    // Fetch feature views before features so we can detect stale empty feature lists.
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
