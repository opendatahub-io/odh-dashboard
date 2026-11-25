import { execFileSync } from 'node:child_process';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as EvalHubTestFlows from '../evalHubTestFlows';

let deleteEvalHubCollection: typeof EvalHubTestFlows.deleteEvalHubCollection;
let runEvalHubCleanup: typeof EvalHubTestFlows.runEvalHubCleanup;

const asPromise = <T>(chainable: Cypress.Chainable<T>): Promise<T> =>
  chainable as unknown as Promise<T>;

const dashboardOrigin = 'https://dashboard.example';

const makeResponse = (status: number, type: ResponseType = 'basic'): Response =>
  ({
    status,
    type,
    redirected: false,
    url: `${dashboardOrigin}/eval-hub/api/v1/evaluations/collections/collection-1`,
    text: () => Promise.resolve(''),
  } as Response);

const setupCypress = ({ serial = false }: { serial?: boolean } = {}) => {
  const fetch = jest.fn<Window['fetch']>().mockResolvedValue(makeResponse(204));
  const appWindow = {
    location: { origin: dashboardOrigin },
    AbortController,
    setTimeout: jest.fn(() => 1),
    clearTimeout: jest.fn(),
    fetch,
  };
  let commandQueue: Promise<unknown> = Promise.resolve();
  const commands = {
    then: jest.fn((optionsOrCallback: unknown, callback?: () => unknown) => {
      const run = (
        typeof optionsOrCallback === 'function' ? optionsOrCallback : callback
      ) as () => unknown;
      if (!serial) {
        return Promise.resolve().then(run);
      }
      const next = commandQueue.then(run);
      commandQueue = next.then(() => undefined);
      return next;
    }),
    wrap: jest.fn((value: unknown) => Promise.resolve(value)),
    wait: jest.fn(() => Promise.resolve()),
    log: jest.fn(),
  };

  Object.assign(globalThis, {
    cy: commands,
    Cypress: {
      Promise,
      config: jest.fn(() => `${dashboardOrigin}/console`),
      env: jest.fn((key: string) => (key === 'MAAS_API_KEY' ? 'sensitive-value' : undefined)),
      state: jest.fn(() => appWindow),
    },
  });

  return { appWindow, commands, fetch };
};

beforeAll(() => {
  setupCypress();
  ({ deleteEvalHubCollection, runEvalHubCleanup } =
    jest.requireActual<typeof EvalHubTestFlows>('../evalHubTestFlows'));
});

describe('EvalHub dashboard cleanup requests', () => {
  let runtime: ReturnType<typeof setupCypress>;

  beforeEach(() => {
    runtime = setupCypress();
  });

  it('should dispatch an authenticated DELETE without following redirects', async () => {
    const reportFailure = jest.fn<(message: string) => void>();

    await asPromise(deleteEvalHubCollection('tenant-1', 'collection-1', { reportFailure }));

    expect(runtime.fetch).toHaveBeenCalledWith(
      `${dashboardOrigin}/eval-hub/api/v1/evaluations/collections/collection-1?namespace=tenant-1`,
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
        redirect: 'manual',
      }),
    );
    const [requestUrl, requestOptions] = runtime.fetch.mock.calls[0];
    // Jest's jsdom has no Request constructor; Node's Fetch implementation validates the same options.
    expect(() =>
      execFileSync(process.execPath, [
        '-e',
        'new Request(process.argv[1], JSON.parse(process.argv[2]))',
        String(requestUrl),
        JSON.stringify({
          method: requestOptions?.method,
          credentials: requestOptions?.credentials,
          redirect: requestOptions?.redirect,
        }),
      ]),
    ).not.toThrow();
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('should report an opaque redirect without replaying or retrying the DELETE', async () => {
    const reportFailure = jest.fn<(message: string) => void>();
    runtime.fetch.mockResolvedValue(makeResponse(0, 'opaqueredirect'));

    await asPromise(deleteEvalHubCollection('tenant-1', 'collection-1', { reportFailure }));

    expect(runtime.fetch).toHaveBeenCalledTimes(1);
    expect(runtime.commands.wait).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('redirected'));
  });

  it('should refuse a cleanup request when the browser is on another origin', async () => {
    const reportFailure = jest.fn<(message: string) => void>();
    runtime.appWindow.location.origin = 'https://other.example';

    await asPromise(deleteEvalHubCollection('tenant-1', 'collection-1', { reportFailure }));

    expect(runtime.fetch).not.toHaveBeenCalled();
    expect(runtime.commands.wait).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('current origin'));
  });

  it('should recover from a transient dashboard response', async () => {
    const reportFailure = jest.fn<(message: string) => void>();
    runtime.fetch.mockResolvedValueOnce(makeResponse(503)).mockResolvedValueOnce(makeResponse(204));

    await asPromise(deleteEvalHubCollection('tenant-1', 'collection-1', { reportFailure }));

    expect(runtime.fetch).toHaveBeenCalledTimes(2);
    expect(runtime.commands.wait).toHaveBeenCalledTimes(1);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('should retry a transient response and stop after the attempt limit', async () => {
    const reportFailure = jest.fn<(message: string) => void>();
    runtime.fetch.mockResolvedValue(makeResponse(503));

    await asPromise(deleteEvalHubCollection('tenant-1', 'collection-1', { reportFailure }));

    expect(runtime.fetch).toHaveBeenCalledTimes(6);
    expect(runtime.commands.wait).toHaveBeenCalledTimes(5);
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
  });

  // eslint-disable-next-line cypress/no-async-tests -- Jest awaits a stubbed queue, not real Cypress commands.
  it('should continue later steps and emit one sanitized warning summary', async () => {
    runtime = setupCypress({ serial: true });
    const order: string[] = [];
    let releaseReport: () => void = () => undefined;
    const delayedReport = new Promise<void>((resolve) => {
      releaseReport = resolve;
    });
    runEvalHubCleanup([
      {
        description: 'Delete experiment',
        run: ({ reportFailure }) => {
          order.push('experiment');
          return delayedReport.then(() => {
            reportFailure('failed with sensitive-value');
          }) as unknown as Cypress.Chainable<void>;
        },
      },
      {
        description: 'Delete project',
        run: () => {
          order.push('project');
          throw new Error('project deletion failed');
        },
      },
      {
        description: 'Delete HardwareProfile',
        run: () => {
          order.push('hardware profile');
        },
      },
    ]);
    await Promise.resolve();
    expect(order).toEqual(['experiment']);
    expect(runtime.commands.log).not.toHaveBeenCalled();
    releaseReport();
    await Promise.all(runtime.commands.then.mock.results.map(({ value }) => value));

    expect(order).toEqual(['experiment', 'project', 'hardware profile']);
    expect(runtime.commands.log).toHaveBeenCalledTimes(1);
    const warning = runtime.commands.log.mock.calls[0][0];
    expect(warning).toContain('2 warning(s)');
    expect(warning).toContain('failed with ***');
    expect(warning).not.toContain('sensitive-value');
    expect(warning).toContain('project deletion failed');
  });
});
