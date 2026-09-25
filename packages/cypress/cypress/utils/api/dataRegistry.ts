import { getOCToken } from './featureStoreRest';

const DATA_REGISTRY_API = '/data-registry/api/v1';

const assetUrl = (project: string, collection: string, assetName: string): string =>
  `${DATA_REGISTRY_API}/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(
    collection,
  )}/generic-tables/${encodeURIComponent(assetName)}`;

const assetCollectionUrl = (project: string, collection: string): string =>
  `${DATA_REGISTRY_API}/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(
    collection,
  )}/generic-tables`;

const collectionUrl = (project: string, collection: string): string =>
  `${DATA_REGISTRY_API}/${encodeURIComponent(project)}/namespaces/${encodeURIComponent(
    collection,
  )}`;

const requestHeaders = (token: string): Record<string, string> => ({
  accept: 'application/json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Forwarded-Access-Token': token,
});

const deleteDataRegistryResource = (url: string, resourceDescription: string): Cypress.Chainable =>
  getOCToken()
    .then((token) =>
      cy.request({
        method: 'DELETE',
        url,
        headers: requestHeaders(token),
        failOnStatusCode: false,
        log: false,
      }),
    )
    .then((response) => {
      if (![200, 202, 204, 404].includes(response.status)) {
        throw new Error(
          `Failed to delete Data Registry ${resourceDescription}: HTTP ${response.status}`,
        );
      }
    });

const verifyDataRegistryResourceExists = (
  url: string,
  resourceDescription: string,
): Cypress.Chainable =>
  getOCToken()
    .then((token) =>
      cy.request({
        method: 'GET',
        url,
        headers: requestHeaders(token),
        failOnStatusCode: false,
        log: false,
      }),
    )
    .then((response) => {
      if (response.status !== 200) {
        throw new Error(
          `Failed to verify Data Registry ${resourceDescription}: HTTP ${response.status}`,
        );
      }
    });

/**
 * Creates the table used by the live Data Registry browse tests when it is not already present.
 * Returns true only when this helper created the asset, allowing cleanup to preserve pre-existing data.
 */
export const seedDataRegistryBrowseAsset = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable<boolean> => {
  let created = false;

  return getOCToken()
    .then((token) => {
      const headers = requestHeaders(token);
      return cy
        .request({
          method: 'GET',
          url: assetUrl(project, collection, assetName),
          headers,
          failOnStatusCode: false,
          log: false,
        })
        .then((response) => {
          if (response.status === 200) {
            return;
          }
          if (response.status !== 404) {
            throw new Error(
              `Failed to check Data Registry asset ${assetName}: HTTP ${response.status}`,
            );
          }

          return cy
            .request({
              method: 'POST',
              url: assetCollectionUrl(project, collection),
              headers,
              body: {
                name: assetName,
                format: 'iceberg',
                description: 'Data Registry browse test asset',
              },
              failOnStatusCode: false,
              log: false,
            })
            .then((createResponse) => {
              if (createResponse.status === 200 || createResponse.status === 201) {
                created = true;
                return;
              }
              if (createResponse.status === 409) {
                return;
              }
              throw new Error(
                `Failed to seed Data Registry asset ${assetName}: HTTP ${createResponse.status}`,
              );
            });
        });
    })
    .then(() => created);
};

/**
 * Deletes a Data Registry asset. Missing assets are treated as already cleaned up.
 */
export const deleteDataRegistryAsset = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable =>
  deleteDataRegistryResource(assetUrl(project, collection, assetName), `asset ${assetName}`);

/**
 * Deletes a seeded Data Registry browse asset. Missing assets are treated as already cleaned up.
 */
export const deleteDataRegistryBrowseAsset = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable => deleteDataRegistryAsset(project, collection, assetName);

/**
 * Verifies that a Data Registry asset exists in the backend.
 */
export const verifyDataRegistryAssetExists = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable =>
  verifyDataRegistryResourceExists(assetUrl(project, collection, assetName), `asset ${assetName}`);

/**
 * Deletes a Data Registry collection. Missing collections are treated as already cleaned up.
 */
export const deleteDataRegistryCollection = (
  project: string,
  collection: string,
): Cypress.Chainable =>
  deleteDataRegistryResource(collectionUrl(project, collection), `collection ${collection}`);

/**
 * Verifies that a Data Registry collection exists in the backend.
 */
export const verifyDataRegistryCollectionExists = (
  project: string,
  collection: string,
): Cypress.Chainable =>
  verifyDataRegistryResourceExists(collectionUrl(project, collection), `collection ${collection}`);
