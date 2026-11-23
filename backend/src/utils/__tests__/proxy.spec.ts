import httpProxy from '@fastify/http-proxy';
import { KubeFastifyInstance } from '../../types';
import { proxyService, registerProxy } from '../proxy';
import { getUndiciTLSOptions } from '../caBundles';

jest.mock('@fastify/http-proxy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../caBundles', () => ({
  getUndiciTLSOptions: jest.fn(() => ({ connect: { ca: [Buffer.from('service-ca')] } })),
}));

describe('proxy registration', () => {
  const createFastify = () =>
    ({
      register: jest.fn(),
      log: { info: jest.fn(), error: jest.fn() },
    } as unknown as KubeFastifyInstance);

  const expectedUndiciOptions = { connect: { ca: [Buffer.from('service-ca')] } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass CA bundles to undici for proxyService', async () => {
    const fastify = createFastify();
    const plugin = proxyService(
      null,
      { name: 'model-registry', namespace: 'models', internalPort: 8443 },
      { host: 'localhost', port: 8443 },
    );

    await plugin(fastify);

    expect(fastify.register).toHaveBeenCalledWith(
      httpProxy,
      expect.objectContaining({ undici: expectedUndiciOptions }),
    );
    const options = (fastify.register as jest.Mock).mock.calls[0][1];
    expect(options.undici.connect.rejectUnauthorized).toBeUndefined();
  });

  it('should pass CA bundles to undici for registerProxy', async () => {
    const fastify = createFastify();

    await registerProxy(fastify, {
      prefix: '/api/model-registry',
      service: { name: 'model-registry', namespace: 'models', port: 8443 },
    });

    expect(fastify.register).toHaveBeenCalledWith(
      httpProxy,
      expect.objectContaining({ undici: expectedUndiciOptions }),
    );
    const options = (fastify.register as jest.Mock).mock.calls[0][1];
    expect(options.undici.connect.rejectUnauthorized).toBeUndefined();
  });

  it('should not load undici TLS options for proxyService when TLS is disabled', async () => {
    const fastify = createFastify();
    const plugin = proxyService(
      null,
      { name: 'model-registry', namespace: 'models', internalPort: 8080 },
      { host: 'localhost', port: 8080 },
      undefined,
      false,
    );

    await plugin(fastify);

    const options = (fastify.register as jest.Mock).mock.calls[0][1];
    expect(options.undici).toBeUndefined();
    expect(getUndiciTLSOptions).not.toHaveBeenCalled();
  });

  it('should not load undici TLS options for registerProxy when TLS is disabled', async () => {
    const fastify = createFastify();

    await registerProxy(fastify, {
      prefix: '/api/model-registry',
      service: { name: 'model-registry', namespace: 'models', port: 8080 },
      tls: false,
    });

    const options = (fastify.register as jest.Mock).mock.calls[0][1];
    expect(options.undici).toBeUndefined();
    expect(getUndiciTLSOptions).not.toHaveBeenCalled();
  });
});
