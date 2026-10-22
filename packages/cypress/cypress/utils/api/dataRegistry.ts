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
});

const browserSessionHeaders = {
  accept: 'application/json',
  'Content-Type': 'application/json',
};

const summarizeDataRegistryResponse = (response: {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}): Record<string, unknown> => {
  const { status, body, headers } = response;
  const { 'content-type': contentType } = headers;
  const summary: Record<string, unknown> = {
    statusCode: status,
    contentType: contentType ?? null,
    bodyType: Array.isArray(body) ? 'array' : body === null ? 'null' : typeof body,
  };
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return summary;
  }

  const bodyRecord = body as Record<string, unknown>;
  summary.bodyKeys = Object.keys(bodyRecord);
  for (const key of [
    'name',
    'uuid',
    'collection',
    'asset_type',
    'format',
    'reason',
    'code',
    'message',
    'detail',
    'status_code',
  ]) {
    if (bodyRecord[key] !== undefined) {
      summary[key] = bodyRecord[key];
    }
  }
  if (bodyRecord.error && typeof bodyRecord.error === 'object') {
    const error = bodyRecord.error as Record<string, unknown>;
    summary.error = Object.fromEntries(
      ['code', 'type', 'message'].flatMap((key) =>
        error[key] === undefined ? [] : [[key, error[key]]],
      ),
    );
  }
  return summary;
};

const deleteDataRegistryResource = (url: string, resourceDescription: string): Cypress.Chainable =>
  getOCToken()
    .then((token) =>
      cy.location('origin').then((origin) =>
        cy.request({
          method: 'DELETE',
          url: `${origin}${url}`,
          headers: requestHeaders(token),
          failOnStatusCode: false,
          log: false,
        }),
      ),
    )
    .then((response) => {
      if (![200, 202, 204, 404].includes(response.status)) {
        throw new Error(
          `Failed to delete Data Registry ${resourceDescription}: ${JSON.stringify(
            summarizeDataRegistryResponse(response),
          )}`,
        );
      }
    });

const verifyDataRegistryResourceStatus = (
  url: string,
  resourceDescription: string,
  expectedStatus: number,
): Cypress.Chainable =>
  getOCToken()
    .then((token) =>
      cy.location('origin').then((origin) =>
        cy.request({
          method: 'GET',
          url: `${origin}${url}`,
          headers: requestHeaders(token),
          failOnStatusCode: false,
          log: false,
        }),
      ),
    )
    .then((response) => {
      if (response.status !== expectedStatus) {
        throw new Error(
          `Failed to verify Data Registry ${resourceDescription}: expected HTTP ${expectedStatus}, ` +
            `got ${JSON.stringify(summarizeDataRegistryResponse(response))}`,
        );
      }
    });

const verifyDataRegistryResourceExists = (
  url: string,
  resourceDescription: string,
): Cypress.Chainable => verifyDataRegistryResourceStatus(url, resourceDescription, 200);

const verifyDataRegistryResourceDoesNotExist = (
  url: string,
  resourceDescription: string,
): Cypress.Chainable => verifyDataRegistryResourceStatus(url, resourceDescription, 404);

/**
 * Creates the browse asset as the logged-in browser user when it is not already present.
 * The Data Registry assigns ownership from the authenticated identity, so this must run after
 * browser login. Returns true only when this helper created the asset.
 */
export const seedDataRegistryBrowseAsset = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable<boolean> => {
  let browserOrigin: string;
  let assetLookupSummary: Record<string, unknown> | undefined;
  let createSummary: Record<string, unknown> | undefined;

  const verifyAssetIsAvailable = () =>
    cy
      .request({
        method: 'GET',
        url: `${browserOrigin}${assetUrl(project, collection, assetName)}`,
        headers: browserSessionHeaders,
        failOnStatusCode: false,
        log: false,
      })
      .then((response) => {
        return cy
          .request({
            method: 'GET',
            url: `${browserOrigin}${assetCollectionUrl(project, collection)}`,
            headers: browserSessionHeaders,
            failOnStatusCode: false,
            log: false,
          })
          .then((listResponse) => {
            const assetNames = (
              listResponse.body as { assets?: Array<{ name: string }> } | undefined
            )?.assets?.map(({ name }) => name);
            expect(response.status, 'Data Registry asset detail response').to.equal(200);
            expect(
              (response.body as { name?: string } | undefined)?.name,
              'Data Registry asset detail name',
            ).to.equal(assetName);
            expect(listResponse.status, 'Data Registry asset list response').to.equal(200);
            expect(assetNames, 'Data Registry asset list').to.include(assetName);
          });
      });

  const createAsset = (): Cypress.Chainable<boolean> =>
    cy
      .request({
        method: 'POST',
        url: `${browserOrigin}${assetCollectionUrl(project, collection)}`,
        headers: browserSessionHeaders,
        body: {
          name: assetName,
          format: 'iceberg',
          description: 'Data Registry browse test asset',
        },
        failOnStatusCode: false,
        log: false,
      })
      .then((createResponse) => {
        createSummary = summarizeDataRegistryResponse(createResponse);
        if (createResponse.status === 200 || createResponse.status === 201) {
          return true;
        }
        if (createResponse.status === 409) {
          return false;
        }
        throw new Error(
          `Failed to seed Data Registry asset ${assetName}: ${JSON.stringify(createSummary)}`,
        );
      });

  const ensureAssetExists = (): Cypress.Chainable<boolean> =>
    cy
      .request({
        method: 'GET',
        url: `${browserOrigin}${assetUrl(project, collection, assetName)}`,
        headers: browserSessionHeaders,
        failOnStatusCode: false,
        log: false,
      })
      .then((response) => {
        assetLookupSummary = summarizeDataRegistryResponse(response);
        if (response.status === 200) {
          const existingAssetName = (response.body as { name?: string } | undefined)?.name;
          if (existingAssetName === assetName) {
            return cy.wrap(false, { log: false });
          }
          const responseKeys =
            response.body && typeof response.body === 'object' ? Object.keys(response.body) : [];
          throw new Error(
            `Data Registry asset lookup for ${assetName} returned HTTP 200 without ` +
              `confirming that asset (${JSON.stringify({
                lookup: assetLookupSummary,
                responseKeys,
              })})`,
          );
        }
        if (response.status !== 404) {
          throw new Error(
            `Failed to check Data Registry asset ${assetName}: HTTP ${response.status}`,
          );
        }
        return createAsset();
      });

  return cy
    .location('origin')
    .then((origin) => {
      browserOrigin = origin;
      return ensureAssetExists();
    })
    .then((wasCreated) => verifyAssetIsAvailable().then(() => wasCreated));
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
 * Verifies that a Data Registry asset has been removed.
 */
export const verifyDataRegistryAssetDoesNotExist = (
  project: string,
  collection: string,
  assetName: string,
): Cypress.Chainable =>
  verifyDataRegistryResourceDoesNotExist(
    assetUrl(project, collection, assetName),
    `asset ${assetName}`,
  );

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
