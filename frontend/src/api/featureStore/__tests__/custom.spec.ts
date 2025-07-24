import { proxyGET } from '#~/api/proxyUtils';
import { handleFeatureStoreFailures } from '#~/api/featureStore/errorUtils';
import { listFeatureStoreProject, getEntities, getFeatureViews } from '#~/api/featureStore/custom';
import { FEATURE_STORE_API_VERSION } from '#~/pages/featureStore/const';

const mockProxyPromise = Promise.resolve();

jest.mock('#~/api/proxyUtils', () => ({
  proxyGET: jest.fn(() => mockProxyPromise),
}));

jest.mock('#~/api/featureStore/errorUtils', () => ({
  handleFeatureStoreFailures: jest.fn((promise) => promise),
}));

const proxyGETMock = jest.mocked(proxyGET);
const handleFeatureStoreFailuresMock = jest.mocked(handleFeatureStoreFailures);

describe('listFeatureStoreProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET and handleFeatureStoreFailures to fetch projects', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = listFeatureStoreProject(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/projects`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should work with empty options', () => {
    const hostPath = 'test-host';
    const opts = {};

    listFeatureStoreProject(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/projects`,
      opts,
    );
  });
});

describe('getEntities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with all entities endpoint when no project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = getEntities(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/entities/all`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';

    const result = getEntities(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/entities?project=${encodeURIComponent(project)}`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with all feature views endpoint when no project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = getFeatureViews(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/featureviews/all&include_relationships=false`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';

    const result = getFeatureViews(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/featureviews?project=${encodeURIComponent(
        project,
      )}&include_relationships=false`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});
