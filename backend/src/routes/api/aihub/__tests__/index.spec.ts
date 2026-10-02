import { fastify, FastifyInstance } from 'fastify';
import type { AIHubKind } from '@odh-dashboard/k8s-core/aihub';
import { KubeFastifyInstance } from '../../../../types';
import { isAIHubResourceNotFoundError } from '../../../../utils/aihub';
import { getAIHub, getAIHubFetchError } from '../../../../utils/resourceUtils';
import aihubRoute from '../index';

jest.mock('../../../../utils/resourceUtils', () => ({
  getAIHub: jest.fn(),
  getAIHubFetchError: jest.fn(),
}));

jest.mock('../../../../utils/aihub', () => ({
  ...jest.requireActual('../../../../utils/aihub'),
  isAIHubResourceNotFoundError: jest.fn(),
}));

const mockGetAIHub = jest.mocked(getAIHub);
const mockGetAIHubFetchError = jest.mocked(getAIHubFetchError);
const mockIsAIHubResourceNotFoundError = jest.mocked(isAIHubResourceNotFoundError);

describe('aihub route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsAIHubResourceNotFoundError.mockReturnValue(false);
    app = fastify();
    await aihubRoute(app as KubeFastifyInstance);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return null when the AIHub fetch error is classified as a missing resource', async () => {
    const fetchError = { response: { statusCode: 404 } };
    mockGetAIHubFetchError.mockReturnValue(fetchError);
    mockIsAIHubResourceNotFoundError.mockReturnValue(true);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('null');
    expect(mockIsAIHubResourceNotFoundError).toHaveBeenCalledWith(fetchError);
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
    const aihub: AIHubKind = {
      apiVersion: 'components.platform.opendatahub.io/v1alpha1',
      kind: 'AIHub',
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
    const fetchError = { response: { statusCode: 404 } };
    mockGetAIHubFetchError.mockReturnValue(fetchError);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toBe('null');
    expect(mockIsAIHubResourceNotFoundError).toHaveBeenCalledWith(fetchError);
  });

  it('should preserve an unavailable AIHub fetch error', async () => {
    mockGetAIHubFetchError.mockReturnValue({ response: { statusCode: 500 } });

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
  });
});
