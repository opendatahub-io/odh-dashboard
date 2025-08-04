import type {
  CyHttpMessages,
  HttpResponseInterceptor,
  Interception,
  RouteMatcher,
  StaticResponse,
  WaitOptions,
} from 'cypress/types/net-stubbing';
import type { InterceptSnapshot, InterceptTrigger } from '#~/__tests__/cypress/cypress/types';

const INTERCEPT_SNAPSHOT_DIR = '__intercept__';

const COMMON_SNAP = 'common.snap.json';

const COMMON_PREFIX = 'common:';

export const commonAlias = (alias: string): string | undefined =>
  alias.match(new RegExp(`^@?${COMMON_PREFIX}(.+)$`))?.[1];

export const interceptSnapshotFile = (specPath: string, alias?: string): string => {
  if (alias && commonAlias(alias)) {
    return `cypress/e2e/${INTERCEPT_SNAPSHOT_DIR}/${COMMON_SNAP}`;
  }
  const segments = specPath.split('/');
  return [
    ...segments.slice(0, segments.length - 1),
    INTERCEPT_SNAPSHOT_DIR,
    segments[segments.length - 1].replace('.scy.ts', '.snap.json'),
  ].join('/');
};

export const snapshotName = (
  titlePath: Cypress.Cypress['currentTest']['titlePath'],
  alias: string,
): string => commonAlias(alias) || `${titlePath.join(' > ')} > ${alias.replace(/^@/, '')}`;

export const serializeSnapshot = (res: CyHttpMessages.IncomingResponse): string =>
  JSON.stringify({
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body,
  });

export const updateJSONFileKey = (
  path: string,
  key: string,
  value?: unknown,
): Cypress.Chainable<{
  [key: string]: unknown;
}> =>
  readJSON(path).then((assignableData) => {
    if (typeof value === 'undefined') {
      delete assignableData[key];
    } else {
      assignableData[key] = value;
    }
    cy.writeFile(path, JSON.stringify(assignableData));
  });

export const readJSON = (
  path: string,
): Cypress.Chainable<{
  [key: string]: unknown;
}> => cy.task('readJSON', path) as Cypress.Chainable<{ [key: string]: unknown }>;

export const waitSnapshot = (
  alias: string,
  options?: Partial<WaitOptions>,
): Cypress.Chainable<Interception> => {
  if (Cypress.env('MOCK') || !Cypress.env('RECORD')) {
    return cy.wait(alias, options);
  }
  return cy
    .log(`Snapshot capture for: ${alias}`)
    .wait(alias)
    .then((interception) => {
      const res = interception.response;
      const req = interception.request;
      const key = snapshotName(Cypress.currentTest.titlePath, alias);
      if (res) {
        const url = new URL(req.url);
        return updateJSONFileKey(interceptSnapshotFile(Cypress.spec.relative, alias), key, {
          method: req.method,
          url: `${url.pathname}${url.search ? `?${url.search}` : ''}`,
          statusCode: res.statusCode,
          body: res.body,
        }).then(() => interception);
      }
      throw Error(`Invalid response. No snapshot created for ${key}`);
    });
};

const controlledIntercept = (
  alias: string,
  requestMatcher: RouteMatcher,
  response?: StaticResponse | HttpResponseInterceptor,
) => {
  let triggerResolve: () => void;
  const controller = new Promise<void>((resolve) => {
    triggerResolve = resolve;
  });

  const trigger: InterceptTrigger = () => triggerResolve();

  return cy
    .intercept(requestMatcher, (request) =>
      controller.then(() => {
        if (response) {
          request.reply(response);
        } else {
          request.continue();
        }
      }),
    )
    .as(alias)
    .wrap(trigger);
};

// TODO support url as RouteMatcher
export const interceptSnapshot: InterceptSnapshot = ((url, alias, controlled) => {
  if (Cypress.env('MOCK')) {
    return cy
      .log(`Snapshot reply for: ${alias}`)
      .readSnapshot(interceptSnapshotFile(Cypress.spec.relative, alias))
      .then((data) => {
        const key = snapshotName(Cypress.currentTest.titlePath, alias);
        const { statusCode, body } = data[key];
        if (statusCode) {
          return controlled
            ? controlledIntercept(alias, url, { statusCode, body })
            : cy.intercept(url, { statusCode, body }).as(alias);
        }
        throw new Error(`No intercept snapshot found for ${key}`);
      });
  }
  return controlled ? controlledIntercept(alias, url) : cy.intercept(url).as(alias);
}) as InterceptSnapshot;
