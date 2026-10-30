import { getOCToken } from './featureStoreRest';

const DATA_REGISTRY_API = '/data-registry/api/v1';
export const dataRegistryProxyResponseTimeoutMs = 70_000;
const apiReadinessMaxAttempts = 12;
const apiReadinessRetryIntervalMs = 5_000;

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

const projectCollectionsUrl = (project: string): string =>
  `${DATA_REGISTRY_API}/${encodeURIComponent(project)}/namespaces`;

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

type DataRegistryDeleteResponse = {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
};

type DataRegistryDeleteRequestResult =
  | { response: DataRegistryDeleteResponse }
  | { transportError: string };

const requestDataRegistryDelete = (
  url: string,
  token: string,
): Cypress.Chainable<DataRegistryDeleteRequestResult> =>
  cy.location('origin').then((origin) =>
    cy
      .window({ log: false })
      .then(
        { timeout: dataRegistryProxyResponseTimeoutMs + 1_000 },
        async (window): Promise<DataRegistryDeleteRequestResult> => {
          const controller = new window.AbortController();
          const timeout = window.setTimeout(
            () => controller.abort(),
            dataRegistryProxyResponseTimeoutMs,
          );
          try {
            // Unlike cy.request, browser fetch lets cleanup turn transport errors into values so
            // later cleanup steps can still run.
            const response = await window.fetch(`${origin}${url}`, {
              method: 'DELETE',
              headers: requestHeaders(token),
              credentials: 'same-origin',
              signal: controller.signal,
            });
            const responseText = await response.text();
            let body: unknown;
            if (responseText) {
              try {
                body = JSON.parse(responseText) as unknown;
              } catch {
                body = responseText;
              }
            }
            return {
              response: {
                status: response.status,
                body,
                headers: { 'content-type': response.headers.get('content-type') },
              },
            };
          } catch (error) {
            return {
              transportError: error instanceof Error ? error.message : String(error),
            };
          } finally {
            window.clearTimeout(timeout);
          }
        },
      ),
  );

export type DataRegistryDeleteOptions = {
  /** Return a failure message instead of throwing so teardown can attempt remaining cleanup. */
  continueOnError?: boolean;
};

const deleteDataRegistryResource = (
  url: string,
  resourceDescription: string,
  { continueOnError = false }: DataRegistryDeleteOptions = {},
): Cypress.Chainable<string | false> =>
  cy
    .exec('oc whoami -t', { failOnNonZeroExit: false, log: false })
    .then((tokenResult): Cypress.Chainable<string | false> => {
      const returnFailure = (failureMessage: string): Cypress.Chainable<string | false> => {
        if (continueOnError) {
          return cy.wrap<string | false>(failureMessage, { log: false });
        }
        throw new Error(failureMessage);
      };

      const token = tokenResult.stdout.trim();
      if (tokenResult.exitCode !== 0 || !token) {
        return returnFailure(
          `Failed to get OC token for Data Registry ${resourceDescription}: ${
            tokenResult.stderr || tokenResult.stdout
          }`,
        );
      }

      return requestDataRegistryDelete(url, token).then(
        (result): Cypress.Chainable<string | false> => {
          if ('transportError' in result) {
            return returnFailure(
              `Failed to delete Data Registry ${resourceDescription}: request failed: ${result.transportError}`,
            );
          }

          const { response } = result;
          if (![200, 202, 204, 404].includes(response.status)) {
            return returnFailure(
              `Failed to delete Data Registry ${resourceDescription}: ${JSON.stringify(
                summarizeDataRegistryResponse(response),
              )}`,
            );
          }
          return cy.wrap<string | false>(false, { log: false });
        },
      );
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
 * Waits for the project-scoped Data Registry API route to respond through the dashboard BFF.
 * The FeatureStore pod and CR can be Ready before this upstream route is serving requests.
 * Call after browser login so the request uses the same browser session as the UI.
 */
export const waitForDataRegistryProjectCollectionsApi = (project: string): Cypress.Chainable => {
  let attempt = 0;

  const check = (): Cypress.Chainable =>
    cy
      .request({
        method: 'GET',
        url: projectCollectionsUrl(project),
        headers: browserSessionHeaders,
        failOnStatusCode: false,
        log: false,
        retryOnNetworkFailure: true,
        timeout: dataRegistryProxyResponseTimeoutMs,
      })
      .then((response) => {
        attempt += 1;
        const namespaces = (response.body as { namespaces?: unknown } | undefined)?.namespaces;
        if (response.status === 200 && Array.isArray(namespaces)) {
          cy.log(`Data Registry API is responding for project ${project}`);
          return cy.wrap(undefined, { log: false });
        }

        const lastResponse = JSON.stringify(summarizeDataRegistryResponse(response));
        if (attempt >= apiReadinessMaxAttempts) {
          throw new Error(
            `Data Registry API did not become ready for project ${project} after ${attempt} ` +
              `attempts. Last response: ${lastResponse}`,
          );
        }

        cy.log(
          `Waiting for Data Registry API for project ${project}; ` +
            `attempt ${attempt}/${apiReadinessMaxAttempts} returned ${lastResponse}`,
        );
        // Poll again after a failed API response; this delay is tied to the readiness condition.
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(apiReadinessRetryIntervalMs).then(() => check());
      });

  return check();
};

/**
 * Creates the browse asset as the logged-in browser user when it is not already present.
 * The Data Registry assigns ownership from the authenticated identity, so this must run after
 * browser login. Calls onCreated immediately after a successful POST and before availability checks.
 * Returns true only when this helper created the asset.
 */
export const seedDataRegistryBrowseAsset = (
  project: string,
  collection: string,
  assetName: string,
  onCreated?: () => void,
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
          onCreated?.();
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
  options: DataRegistryDeleteOptions = {},
): Cypress.Chainable<string | false> =>
  deleteDataRegistryResource(
    assetUrl(project, collection, assetName),
    `asset ${assetName}`,
    options,
  );

/**
 * Deletes a seeded Data Registry browse asset. Missing assets are treated as already cleaned up.
 */
export const deleteDataRegistryBrowseAsset = (
  project: string,
  collection: string,
  assetName: string,
  options: DataRegistryDeleteOptions = {},
): Cypress.Chainable<string | false> =>
  deleteDataRegistryAsset(project, collection, assetName, options);

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
 * Verifies that an asset description update has reached the Data Registry API.
 */
export const verifyDataRegistryAssetDescription = (
  project: string,
  collection: string,
  assetName: string,
  expectedDescription: string,
): Cypress.Chainable =>
  getOCToken()
    .then((token) =>
      cy.location('origin').then((origin) =>
        cy.request({
          method: 'GET',
          url: origin + assetUrl(project, collection, assetName),
          headers: requestHeaders(token),
          failOnStatusCode: false,
          log: false,
        }),
      ),
    )
    .then((response) => {
      expect(response.status, 'Data Registry asset detail response').to.equal(200);
      expect(
        (response.body as { description?: string } | undefined)?.description,
        'Data Registry asset description',
      ).to.equal(expectedDescription);
    });

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
  options: DataRegistryDeleteOptions = {},
): Cypress.Chainable<string | false> =>
  deleteDataRegistryResource(
    collectionUrl(project, collection),
    `collection ${collection}`,
    options,
  );

/**
 * Verifies that a Data Registry collection exists in the backend.
 */
export const verifyDataRegistryCollectionExists = (
  project: string,
  collection: string,
): Cypress.Chainable =>
  verifyDataRegistryResourceExists(collectionUrl(project, collection), `collection ${collection}`);

/**
 * Verifies that a Data Registry collection has been removed.
 */
export const verifyDataRegistryCollectionDoesNotExist = (
  project: string,
  collection: string,
): Cypress.Chainable =>
  verifyDataRegistryResourceDoesNotExist(
    collectionUrl(project, collection),
    `collection ${collection}`,
  );
