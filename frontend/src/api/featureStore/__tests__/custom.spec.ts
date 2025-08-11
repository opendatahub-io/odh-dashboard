import { proxyGET } from '#~/api/proxyUtils';
import { handleFeatureStoreFailures } from '#~/api/featureStore/errorUtils';
import {
  listFeatureStoreProject,
  getEntities,
  getFeatureViews,
  getEntityByName,
  getFeatureServices,
  getFeatureServiceByName,
  getFeatureViewByName,
  getFeatures,
  getFeatureByName,
} from '#~/api/featureStore/custom';
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
      `/api/${FEATURE_STORE_API_VERSION}/entities/all?include_relationships=true`,
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
      `/api/${FEATURE_STORE_API_VERSION}/entities?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getEntityByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for entity by name', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const entityName = 'test-entity';

    const result = getEntityByName(hostPath)(opts, project, entityName);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/entities/${encodeURIComponent(
        entityName,
      )}?include_relationships=true&project=${encodeURIComponent(project)}`,
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
      `/api/${FEATURE_STORE_API_VERSION}/feature_views/all?include_relationships=true`,
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
      `/api/${FEATURE_STORE_API_VERSION}/feature_views?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with feature service filter when featureService is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const featureService = 'test-service';

    const result = getFeatureViews(hostPath)(opts, project, undefined, featureService);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_views?project=${encodeURIComponent(
        project,
      )}&feature_service=${encodeURIComponent(featureService)}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with entity filter when entity is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const entity = 'test-entity';

    const result = getFeatureViews(hostPath)(opts, project, entity);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_views?project=${encodeURIComponent(
        project,
      )}&entity=${encodeURIComponent(entity)}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with all feature services endpoint when no project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = getFeatureServices(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_services/all?include_relationships=true`,
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

    const result = getFeatureServices(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_services?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with feature view filter when featureView is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const featureView = 'test-feature-view';

    const result = getFeatureServices(hostPath)(opts, project, featureView);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_services?project=${encodeURIComponent(
        project,
      )}&include_relationships=true&feature_view=${encodeURIComponent(featureView)}`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureServiceByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature service by name', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const featureServiceName = 'test-service';

    const result = getFeatureServiceByName(hostPath)(opts, project, featureServiceName);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_services/${encodeURIComponent(
        featureServiceName,
      )}?project=${encodeURIComponent(project)}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureViewByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature view by name', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const featureViewName = 'test-feature-view';

    const result = getFeatureViewByName(hostPath)(opts, project, featureViewName);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/feature_views/${encodeURIComponent(
        featureViewName,
      )}?project=${encodeURIComponent(project)}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should throw error when project is not provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    expect(() => getFeatureViewByName(hostPath)(opts, undefined, 'test-feature-view')).toThrow(
      'Project is required',
    );
  });

  it('should throw error when feature view name is not provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    expect(() => getFeatureViewByName(hostPath)(opts, 'test-project', undefined)).toThrow(
      'Feature view name is required',
    );
  });
});

describe('getFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with all features endpoint when no project is provided', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = getFeatures(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/features/all`,
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

    const result = getFeatures(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/features?project=${encodeURIComponent(project)}`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature by name', () => {
    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';
    const featureViewName = 'test-feature-view';
    const featureName = 'test-feature';

    const result = getFeatureByName(hostPath)(opts, project, featureViewName, featureName);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/features/${featureViewName}/${featureName}?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });
});
