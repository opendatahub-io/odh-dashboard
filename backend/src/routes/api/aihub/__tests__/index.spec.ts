import { fastify, FastifyInstance } from 'fastify';
import { KubeFastifyInstance } from '../../../../types';
import { getAIHub, getAIHubFetchError } from '../../../../utils/resourceUtils';
import aihubRoute from '../index';

jest.mock('../../../../utils/resourceUtils', () => ({
  getAIHub: jest.fn(),
  getAIHubFetchError: jest.fn(),
}));

const mockGetAIHub = jest.mocked(getAIHub);
const mockGetAIHubFetchError = jest.mocked(getAIHubFetchError);

describe('aihub route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = fastify();
    await aihubRoute(app as KubeFastifyInstance);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return null when the AIHub watcher reports default-aihub is missing', async () => {
    mockGetAIHubFetchError.mockReturnValue({
      response: {
        statusCode: 404,
        body: {
          reason: 'NotFound',
          details: {
            name: 'default-aihub',
            group: 'components.platform.opendatahub.io',
            kind: 'aihubs',
          },
        },
      },
    });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('null');
    expect(mockGetAIHub).not.toHaveBeenCalled();
  });

  it('should return an unavailable error when the watcher has not loaded an AIHub', async () => {
    mockGetAIHubFetchError.mockReturnValue(undefined);
    mockGetAIHub.mockReturnValue(undefined);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toBe('null');
  });

  it('should return the cached AIHub resource', async () => {
    const aihub = {
      metadata: { name: 'default-aihub' },
      spec: { instancesNamespace: 'odh-model-registries' },
    };
    mockGetAIHubFetchError.mockReturnValue(undefined);
    mockGetAIHub.mockReturnValue(aihub);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(aihub);
  });

  it('should preserve a forbidden AIHub fetch error', async () => {
    mockGetAIHubFetchError.mockReturnValue({ response: { statusCode: 403 } });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(500);
  });

  it('should return an unavailable error for an unclassified 404', async () => {
    mockGetAIHubFetchError.mockReturnValue({
      response: {
        statusCode: 404,
        body: { reason: 'NotFound' },
      },
    });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toBe('null');
  });

  it('should preserve an unavailable AIHub fetch error', async () => {
    mockGetAIHubFetchError.mockReturnValue({ response: { statusCode: 500 } });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
  });
});
