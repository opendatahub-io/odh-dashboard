/* eslint-disable camelcase */
import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { handleFeatureStoreFailures } from '../errorUtils';
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
  getDataSources,
  getSavedDatasets,
} from '../custom';
import { FEATURE_STORE_API_VERSION, FEATURE_STORE_PAGE_SIZE } from '../../const';

jest.mock('@odh-dashboard/internal/api/proxyUtils', () => ({
  proxyGET: jest.fn(),
}));

jest.mock('../errorUtils', () => ({
  handleFeatureStoreFailures: jest.fn((promise: Promise<unknown>) => promise),
}));

const proxyGETMock = jest.mocked(proxyGET);
const handleFeatureStoreFailuresMock = jest.mocked(handleFeatureStoreFailures);

describe('listFeatureStoreProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET and handleFeatureStoreFailures to fetch projects', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

    const hostPath = 'test-host';
    const opts = { dryRun: true };

    const result = listFeatureStoreProject(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/projects`,
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledWith(mockProxyPromise);
    expect(result).toBe(mockProxyPromise);
  });

  it('should work with empty options', () => {
    proxyGETMock.mockReturnValue(Promise.resolve());

    const hostPath = 'test-host';
    const opts = {};

    listFeatureStoreProject(hostPath)(opts);

    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/projects`,
      {},
      opts,
    );
  });
});

describe('getEntities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all entities via pagination when no project is provided', async () => {
    const mockEntities = [{ name: 'entity1' }, { name: 'entity2' }];
    const mockResponse = {
      entities: mockEntities,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getEntities('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/entities/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.entities).toEqual(mockEntities);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getEntityByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for entity by name', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all feature views via pagination when no project is provided', async () => {
    const mockViews = [{ name: 'fv1' }, { name: 'fv2' }];
    const mockResponse = {
      featureViews: mockViews,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getFeatureViews('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/feature_views/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.featureViews).toEqual(mockViews);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with feature service filter when featureService is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with entity filter when entity is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });

  it('should paginate with entity filter when no project is provided', async () => {
    const mockViews = [{ name: 'fv1' }];
    const mockResponse = {
      featureViews: mockViews,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getFeatureViews('test-host')({ dryRun: true }, undefined, 'test-entity');

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/feature_views/all?entity=${encodeURIComponent(
        'test-entity',
      )}&include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.featureViews).toEqual(mockViews);
  });
});

describe('getFeatureServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all feature services via pagination when no project is provided', async () => {
    const mockServices = [{ name: 'fs1' }];
    const mockResponse = {
      featureServices: mockServices,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getFeatureServices('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/feature_services/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.featureServices).toEqual(mockServices);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });

  it('should call proxyGET with feature view filter when featureView is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureServiceByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature service by name', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureViewByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature view by name', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
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

  it('should fetch all features via pagination when no project is provided', async () => {
    const mockFeatures = [{ name: 'feat1' }];
    const mockResponse = { features: mockFeatures, pagination: { has_next: false } };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getFeatures('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/features/all?limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.features).toEqual(mockFeatures);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';

    const result = getFeatures(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/features?project=${encodeURIComponent(project)}`,
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getFeatureByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call proxyGET with correct endpoint for feature by name', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

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
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getDataSources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all data sources via pagination when no project is provided', async () => {
    const mockSources = [{ name: 'ds1' }];
    const mockResponse = {
      dataSources: mockSources,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getDataSources('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/data_sources/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.dataSources).toEqual(mockSources);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';

    const result = getDataSources(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/data_sources?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});

describe('getSavedDatasets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all saved datasets via pagination when no project is provided', async () => {
    const mockDatasets = [{ name: 'dataset1' }];
    const mockResponse = {
      savedDatasets: mockDatasets,
      pagination: { has_next: false },
      relationships: {},
    };
    proxyGETMock.mockResolvedValue(mockResponse);

    const result = await getSavedDatasets('test-host')({ dryRun: true });

    expect(proxyGETMock).toHaveBeenCalledWith(
      'test-host',
      `/api/${FEATURE_STORE_API_VERSION}/saved_datasets/all?include_relationships=true&limit=${FEATURE_STORE_PAGE_SIZE}&page=1`,
      {},
      { dryRun: true },
    );
    expect(result.savedDatasets).toEqual(mockDatasets);
  });

  it('should call proxyGET with project-specific endpoint when project is provided', () => {
    const mockProxyPromise = Promise.resolve();
    proxyGETMock.mockReturnValue(mockProxyPromise);

    const hostPath = 'test-host';
    const opts = { dryRun: true };
    const project = 'test-project';

    const result = getSavedDatasets(hostPath)(opts, project);

    expect(proxyGETMock).toHaveBeenCalledTimes(1);
    expect(proxyGETMock).toHaveBeenCalledWith(
      hostPath,
      `/api/${FEATURE_STORE_API_VERSION}/saved_datasets?project=${encodeURIComponent(
        project,
      )}&include_relationships=true`,
      {},
      opts,
    );
    expect(handleFeatureStoreFailuresMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockProxyPromise);
  });
});
