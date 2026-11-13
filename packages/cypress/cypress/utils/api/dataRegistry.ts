const DATA_REGISTRY_API = '/data-registry/api/v1';
export const dataRegistryProxyResponseTimeoutMs = 70_000;
// Allows the 10s token lookup, 70s DELETE request, and 5s completion margin.
const dataRegistryDeleteTaskTimeoutMs = 85_000;
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

const getDataRegistryOCToken = (): Cypress.Chainable<string> =>
  cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((result) => {
    const token = result.stdout.trim();
    if (result.exitCode !== 0 || !token) {
      throw new Error(
        `Failed to get OC token: ${result.stderr || 'oc whoami -t returned no token'}`,
      );
    }
    return cy.wrap(token, { log: false });
  });

const isLoopbackHost = (hostname: string): boolean =>
  ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

const getTrustedDashboardOrigins = (): Set<string> =>
  new Set(
    [Cypress.config('baseUrl'), Cypress.env('ODH_DASHBOARD_CANONICAL_URL')]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .flatMap((value) => {
        try {
          const dashboardUrl = new URL(value);
          return dashboardUrl.protocol === 'https:' ||
            (dashboardUrl.protocol === 'http:' && isLoopbackHost(dashboardUrl.hostname))
            ? [dashboardUrl.origin]
            : [];
        } catch {
          return [];
        }
      }),
  );

const requestDataRegistryResource = (url: string) =>
  cy.location('origin').then((origin) => {
    if (!getTrustedDashboardOrigins().has(origin)) {
      throw new Error('Refusing to send an OpenShift token to an untrusted dashboard origin');
    }

    return getDataRegistryOCToken().then((token) =>
      cy.request({
        method: 'GET',
        url: `${origin}${url}`,
        headers: requestHeaders(token),
        failOnStatusCode: false,
        log: false,
      }),
    );
  });

const requestDataRegistryWithBrowserSession = (url: string) =>
  cy.request({
    method: 'GET',
    url,
    headers: browserSessionHeaders,
    log: false,
    retryOnNetworkFailure: true,
    retryOnStatusCodeFailure: true,
    timeout: dataRegistryProxyResponseTimeoutMs,
  });

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

const verifyDataRegistryBrowserResponse = (
  url: string,
  resourceDescription: string,
  verifyBody: (body: unknown) => void,
): Cypress.Chainable =>
  requestDataRegistryWithBrowserSession(url).then((response) => {
    if (response.status !== 200) {
      throw new Error(
        `Failed to verify Data Registry ${resourceDescription}: expected HTTP 200, ` +
          `got ${JSON.stringify(summarizeDataRegistryResponse(response))}`,
      );
    }
    verifyBody(response.body);
  });

/**
 * Verifies the Data Registry APIs used by the browse page through the logged-in browser session.
 */
export const verifyDataRegistryBrowsePageApi = (
  project: string,
  collection: string,
  options: { expectedAsset?: string; expectedUser?: string } = {},
): Cypress.Chainable => {
  const { expectedAsset, expectedUser } = options;
  const verifyBrowserUser = (): Cypress.Chainable => {
    if (!expectedUser) {
      return cy.wrap(undefined, { log: false });
    }
    return verifyDataRegistryBrowserResponse(
      `${DATA_REGISTRY_API}/user`,
      'browser user',
      (body) => {
        const actualUser = (body as { data?: { userId?: string } } | undefined)?.data?.userId;
        expect(actualUser, 'Data Registry browser identity').to.equal(expectedUser);
      },
    );
  };

  return verifyBrowserUser()
    .then(() =>
      verifyDataRegistryBrowserResponse(`${DATA_REGISTRY_API}/namespaces`, 'namespaces', (body) => {
        const namespaces = (body as { data?: Array<{ name?: string }> } | undefined)?.data
          ?.map((namespace) => namespace.name)
          .filter((name): name is string => Boolean(name));
        expect(namespaces, 'Data Registry namespace response').to.include(project);
      }),
    )
    .then(() =>
      verifyDataRegistryBrowserResponse(
        projectCollectionsUrl(project),
        `collections for project ${project}`,
        (body) => {
          const collections = (
            body as { namespaces?: Array<[string]> } | undefined
          )?.namespaces?.map(([name]) => name);
          expect(collections, 'Data Registry project collections').to.include(collection);
        },
      ),
    )
    .then(() =>
      verifyDataRegistryBrowserResponse(
        assetCollectionUrl(project, collection),
        `assets for ${project}/${collection}`,
        (body) => {
          const assets = (body as { assets?: Array<{ name: string }> } | undefined)?.assets?.map(
            ({ name }) => name,
          );
          if (expectedAsset) {
            expect(assets, 'Data Registry asset list').to.include(expectedAsset);
          }
        },
      ),
    );
};

/**
 * Verifies that the browser-session connections endpoint exposes the expected RHOAI Secret.
 */
export const verifyDataRegistryProjectConnections = (
  project: string,
  expectedSecretName: string,
): Cypress.Chainable =>
  verifyDataRegistryBrowserResponse(
    `${DATA_REGISTRY_API}/connections/${encodeURIComponent(project)}`,
    `connections for project ${project}`,
    (body) => {
      const connectionsResponse = body as
        | {
            data?: Array<{ type?: string; secret_name?: string }>;
            metadata?: {
              rhaiConnections?: Array<{ type?: string; secret_name?: string }>;
              warnings?: Array<{ code?: string; message?: string }>;
            };
          }
        | undefined;
      const connectionSummary = {
        data: (connectionsResponse?.data ?? []).map(({ type, secret_name: secretName }) => ({
          type,
          secretName,
        })),
        rhaiConnections: (connectionsResponse?.metadata?.rhaiConnections ?? []).map(
          ({ type, secret_name: secretName }) => ({ type, secretName }),
        ),
        warnings: connectionsResponse?.metadata?.warnings ?? [],
      };
      const failureMessage =
        'This spec requires selectable RHOAI Secret-fallback connections and does not use DCH; ' +
        `response summary: ${JSON.stringify(connectionSummary)}`;
      const selectableConnections = connectionsResponse?.data ?? [];
      expect(
        selectableConnections.every(({ type }) => type === 'secret'),
        failureMessage,
      ).to.equal(true);
      expect(
        selectableConnections.some(
          ({ type, secret_name: secretName }) =>
            type === 'secret' && secretName === expectedSecretName,
        ),
        failureMessage,
      ).to.equal(true);
    },
  );

type DataRegistryDeleteResponse = {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
};

type DataRegistryDeleteRequestResult =
  | { response: DataRegistryDeleteResponse }
  | { transportError: string }
  | { tokenError: string };

const requestDataRegistryDelete = (
  url: string,
): Cypress.Chainable<DataRegistryDeleteRequestResult> =>
  cy
    .location('origin')
    .then((origin) =>
      cy.task<DataRegistryDeleteRequestResult>(
        'deleteDataRegistryResource',
        { origin, path: url },
        { log: false, timeout: dataRegistryDeleteTaskTimeoutMs },
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
  requestDataRegistryDelete(url).then((result): Cypress.Chainable<string | false> => {
    const returnFailure = (failureMessage: string): Cypress.Chainable<string | false> => {
      if (continueOnError) {
        return cy.wrap<string | false>(failureMessage, { log: false });
      }
      throw new Error(failureMessage);
    };

    if ('tokenError' in result) {
      return returnFailure(
        `Failed to get OC token for Data Registry ${resourceDescription}: ${result.tokenError}`,
      );
    }

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
  });

const verifyDataRegistryResourceStatus = (
  url: string,
  resourceDescription: string,
  expectedStatus: number,
): Cypress.Chainable =>
  requestDataRegistryResource(url).then((response) => {
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
 * Waits for the project-scoped Data Registry API route to return its expected response through
 * the dashboard BFF. The bounded poll covers transient HTTP errors and successful responses whose
 * body is not ready yet, which Cypress's built-in retries do not inspect.
 * Call after browser login so the request uses the same browser session as the UI.
 */
export const waitForDataRegistryProjectCollectionsApi = (project: string): Cypress.Chainable => {
  const check = (attempt = 1): Cypress.Chainable =>
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
        return Cypress.Promise.delay(apiReadinessRetryIntervalMs).then(() => check(attempt + 1));
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
  requestDataRegistryResource(assetUrl(project, collection, assetName)).then((response) => {
    expect(response.status, 'Data Registry asset detail response').to.equal(200);
    expect(
      (response.body as { description?: string } | undefined)?.description,
      'Data Registry asset description',
    ).to.equal(expectedDescription);
  });

/**
 * Verifies that a Data Registry asset references the expected RHOAI Secret connection.
 */
export const verifyDataRegistryAssetConnection = (
  project: string,
  collection: string,
  assetName: string,
  expectedSecretName: string,
): Cypress.Chainable =>
  requestDataRegistryResource(assetUrl(project, collection, assetName)).then((response) => {
    expect(response.status, 'Data Registry asset detail response').to.equal(200);
    const connectionRef = (
      response.body as { connection_ref?: { type?: string; secret_name?: string } } | undefined
    )?.connection_ref;
    expect(connectionRef?.type, 'Registered RHOAI connection reference type').to.equal('secret');
    expect(connectionRef?.secret_name, 'Registered RHOAI connection reference name').to.equal(
      expectedSecretName,
    );
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
