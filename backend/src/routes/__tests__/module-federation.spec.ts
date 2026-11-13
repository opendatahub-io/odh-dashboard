import Fastify from 'fastify';
import { KubeFastifyInstance } from '../../types';
import { registerProxy } from '../../utils/proxy';
import moduleFederation from '../module-federation';

jest.mock('../../utils/proxy', () => ({
  ...jest.requireActual('../../utils/proxy'),
  registerProxy: jest.fn(),
}));

jest.mock('@odh-dashboard/app-config', () => ({
  getModuleFederationConfigs: jest.fn(() => [
    {
      name: 'mlflowEmbedded',
      backend: {
        service: { name: 'mlflow', namespace: 'redhat-ods-applications', port: 8443 },
        localService: { host: 'localhost', port: 8443 },
        authorize: true,
        tls: true,
      },
    },
  ]),
}));

type OnError = (reply: unknown, error: unknown) => void;

const createReply = () => {
  const reply = { code: jest.fn(), send: jest.fn() };
  reply.code.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply;
};

const createFastify = () =>
  ({
    register: jest.fn(),
    get: jest.fn(),
    log: { info: jest.fn(), error: jest.fn() },
  } as unknown as KubeFastifyInstance);

const getBackendOnError = async (): Promise<OnError> => {
  const fastify = createFastify();
  await moduleFederation(fastify);

  const call = (registerProxy as jest.Mock).mock.calls.find(
    ([, config]) => config.prefix === '/_mf/mlflowEmbedded',
  );
  expect(call).toBeDefined();
  return call[1].onError as OnError;
};

/** Stand-in for the `@fastify/error` instances reply-from raises. */
const proxyError = (code: string, statusCode?: number) =>
  Object.assign(new Error('Service Unavailable'), { code, statusCode });

/** Runs the handler against a real Fastify reply, so the status is really applied. */
const respondWith = async (onError: OnError, error: unknown) => {
  const app = Fastify();
  app.get('/', async (_request, reply) => {
    onError(reply, { error });
  });
  const response = await app.inject({ method: 'GET', url: '/' });
  await app.close();
  return response;
};

describe('module federation proxy error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the proxy error itself rather than the { error } envelope', async () => {
    const onError = await getBackendOnError();
    const reply = createReply();
    const error = proxyError('FST_REPLY_FROM_SERVICE_UNAVAILABLE', 503);

    onError(reply, { error });

    expect(reply.send).toHaveBeenCalledWith(error);
    // Fastify takes the status off the error; no explicit code is needed.
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('answers with the status the proxy raised instead of 200', async () => {
    const onError = await getBackendOnError();

    const response = await respondWith(
      onError,
      proxyError('FST_REPLY_FROM_SERVICE_UNAVAILABLE', 503),
    );

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toMatchObject({
      statusCode: 503,
      code: 'FST_REPLY_FROM_SERVICE_UNAVAILABLE',
    });
  });

  it('propagates the status of every proxy error, not just service unavailable', async () => {
    const onError = await getBackendOnError();

    const response = await respondWith(onError, proxyError('FST_REPLY_FROM_GATEWAY_TIMEOUT', 504));

    expect(response.statusCode).toBe(504);
  });

  it('falls back to 500 when the proxy error carries no status', async () => {
    const onError = await getBackendOnError();

    const response = await respondWith(onError, proxyError('SOMETHING_ELSE'));

    expect(response.statusCode).toBe(500);
  });

  it('still converts an internal server error into a 503', async () => {
    const onError = await getBackendOnError();
    const reply = createReply();

    onError(reply, { error: proxyError('FST_REPLY_FROM_INTERNAL_SERVER_ERROR', 500) });

    expect(reply.code).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Service Unavailable', statusCode: 503 }),
    );
  });
});
