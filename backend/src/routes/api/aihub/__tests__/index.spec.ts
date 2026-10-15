import { fastify, FastifyInstance } from 'fastify';
import type { AIHubKind } from '@odh-dashboard/k8s-core/aihub';
import { KubeFastifyInstance } from '../../../../types';
import { isAIHubResourceNotFoundError } from '../../../../utils/aihub';
import { getAIHub, getAIHubFetchError } from '../../../../utils/resourceUtils';
import { getUserInfo } from '../../../../utils/userUtils';
import { isUserAdmin, isUserAllowed } from '../../../../utils/adminUtils';
import { createCustomError } from '../../../../utils/requestUtils';
import aihubRoute from '../index';

jest.mock('../../../../utils/resourceUtils', () => ({
  getAIHub: jest.fn(),
  getAIHubFetchError: jest.fn(),
}));

jest.mock('../../../../utils/aihub', () => ({
  ...jest.requireActual('../../../../utils/aihub'),
  isAIHubResourceNotFoundError: jest.fn(),
}));

jest.mock('../../../../utils/userUtils', () => ({ getUserInfo: jest.fn() }));
jest.mock('../../../../utils/adminUtils', () => ({
  isUserAdmin: jest.fn(),
  isUserAllowed: jest.fn(),
}));

const mockGetAIHub = jest.mocked(getAIHub);
const mockGetAIHubFetchError = jest.mocked(getAIHubFetchError);
const mockIsAIHubResourceNotFoundError = jest.mocked(isAIHubResourceNotFoundError);
const mockGetUserInfo = jest.mocked(getUserInfo);
const mockIsUserAdmin = jest.mocked(isUserAdmin);
const mockIsUserAllowed = jest.mocked(isUserAllowed);

describe('aihub route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockIsAIHubResourceNotFoundError.mockReturnValue(false);
    mockGetUserInfo.mockResolvedValue({ userName: 'test-user', userID: undefined });
    mockIsUserAdmin.mockResolvedValue(false);
    mockIsUserAllowed.mockResolvedValue(true);
    app = fastify();
    await aihubRoute(app as KubeFastifyInstance);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return null when the AIHub fetch error is classified as a missing resource', async () => {
    const fetchError = { response: { statusCode: 404 } };
    mockGetAIHub.mockReturnValue(undefined);
    mockGetAIHubFetchError.mockReturnValue(fetchError);
    mockIsAIHubResourceNotFoundError.mockReturnValue(true);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('null');
    expect(mockIsAIHubResourceNotFoundError).toHaveBeenCalledWith(fetchError);
    expect(mockGetAIHub).toHaveBeenCalled();
    expect(mockGetAIHub.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetAIHubFetchError.mock.invocationCallOrder[0],
    );
  });

  it('should return an unavailable error when the watcher has not loaded an AIHub', async () => {
    mockGetAIHubFetchError.mockReturnValue(undefined);
    mockGetAIHub.mockReturnValue(undefined);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toBe('null');
  });

  it('should return only the instances namespace from the cached AIHub resource', async () => {
    const aihub = {
      apiVersion: 'components.platform.opendatahub.io/v1alpha1',
      kind: 'AIHub',
      metadata: { name: 'default-aihub', annotations: { private: 'not-for-client' } },
      spec: { instancesNamespace: 'odh-model-registries', privateField: 'not-for-client' },
      status: { phase: 'Ready' },
    } as AIHubKind;
    mockGetAIHubFetchError.mockReturnValue(undefined);
    mockGetAIHub.mockReturnValue(aihub);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ instancesNamespace: 'odh-model-registries' });
  });

  it('should reject unauthenticated requests before reading AIHub', async () => {
    mockGetUserInfo.mockRejectedValueOnce(createCustomError('Unauthorized', 'Unauthorized', 401));

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(401);
    expect(mockGetAIHub).not.toHaveBeenCalled();
  });

  it('should reject users without dashboard access before reading AIHub', async () => {
    mockIsUserAllowed.mockResolvedValueOnce(false);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(403);
    expect(mockGetAIHub).not.toHaveBeenCalled();
  });

  it('should not return AIHub data when the dashboard access check fails', async () => {
    mockIsUserAllowed.mockRejectedValueOnce(new Error('Authorization service unavailable'));

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(500);
    expect(mockGetAIHub).not.toHaveBeenCalled();
  });

  it('should allow dashboard admins without requiring the regular user grant', async () => {
    mockIsUserAdmin.mockResolvedValueOnce(true);
    mockGetAIHub.mockReturnValue({
      apiVersion: 'components.platform.opendatahub.io/v1alpha1',
      kind: 'AIHub',
      metadata: { name: 'default-aihub' },
      spec: { instancesNamespace: 'odh-model-registries' },
    });
    mockGetAIHubFetchError.mockReturnValue(undefined);

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(mockIsUserAllowed).not.toHaveBeenCalled();
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
