import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import {
  DataSciencePipelineApplicationModel,
  RouteModel,
  SecretModel,
  createPipelinesCR,
  deletePipelineCR,
  getElyraSecret,
  getPipelineAPIRoute,
  getPipelinesCR,
} from '#~/api';
import { DSPipelineKind, K8sAPIOptions, RouteKind, SecretKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

const k8sGetResourceSecretKindMock = jest.mocked(k8sGetResource<SecretKind>);
const k8sGetResourceRouteKindMock = jest.mocked(k8sGetResource<RouteKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<DSPipelineKind>);
const k8sGetResourceDSPipelineKindMock = jest.mocked(k8sGetResource<DSPipelineKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<DSPipelineKind, K8sStatus>);

describe('getElyraSecret', () => {
  const opts: K8sAPIOptions = {
    dryRun: true,
    signal: undefined,
    parseJSON: true,
  };
  it('should fetch elyra secret', async () => {
    k8sGetResourceSecretKindMock.mockResolvedValue(mockSecretK8sResource({ uid: 'test' }));
    const result = await getElyraSecret('namespace', opts);
    expect(k8sGetResourceSecretKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      payload: { dryRun: ['All'] },
      queryOptions: { name: 'ds-pipeline-config', ns: 'namespace', queryParams: { dryRun: 'All' } },
    });
    expect(k8sGetResourceSecretKindMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockSecretK8sResource({ uid: 'test' }));
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceSecretKindMock.mockRejectedValue(new Error('error1'));
    await expect(getElyraSecret('namespace', opts)).rejects.toThrow('error1');
    expect(k8sGetResourceSecretKindMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceSecretKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: SecretModel,
      payload: { dryRun: ['All'] },
      queryOptions: { name: 'ds-pipeline-config', ns: 'namespace', queryParams: { dryRun: 'All' } },
    });
  });
});

describe('getPipelineAPIRoute', () => {
  it('should fetch pipeline API route', async () => {
    const routeMock = mockRouteK8sResource({});
    k8sGetResourceRouteKindMock.mockResolvedValue(routeMock);
    const result = await getPipelineAPIRoute('namespace', 'ds-pipeline-dspa');
    expect(k8sGetResourceRouteKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RouteModel,
      queryOptions: { name: 'ds-pipeline-dspa', ns: 'namespace', queryParams: {} },
    });
    expect(k8sGetResourceRouteKindMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(routeMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceRouteKindMock.mockRejectedValue(new Error('error1'));
    await expect(getPipelineAPIRoute('namespace', 'ds-pipeline-dspa')).rejects.toThrow('error1');
    expect(k8sGetResourceRouteKindMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceRouteKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RouteModel,
      queryOptions: {
        name: 'ds-pipeline-dspa',
        ns: 'namespace',
        queryParams: {},
      },
    });
  });
});

describe('createPipelinesCR', () => {
  const DSPipelinemock = mockDataSciencePipelineApplicationK8sResource({});
  delete DSPipelinemock.status;
  delete DSPipelinemock.metadata.creationTimestamp;
  it('should create pipelines CR', async () => {
    k8sCreateResourceMock.mockResolvedValue(DSPipelinemock);
    const result = await createPipelinesCR('test-project', DSPipelinemock.spec);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { queryParams: {} },
      resource: DSPipelinemock,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(DSPipelinemock);
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createPipelinesCR('test-project', DSPipelinemock.spec)).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { queryParams: {} },
      resource: DSPipelinemock,
    });
  });
});

describe('getPipelinesCR', () => {
  const DSPipelinemock = mockDataSciencePipelineApplicationK8sResource({});
  it('should fetch pipelines CR', async () => {
    k8sGetResourceDSPipelineKindMock.mockResolvedValue(DSPipelinemock);
    const result = await getPipelinesCR('namespace', 'dspa');
    expect(k8sGetResourceDSPipelineKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: 'dspa', ns: 'namespace', queryParams: {} },
    });
    expect(k8sGetResourceDSPipelineKindMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(DSPipelinemock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceDSPipelineKindMock.mockRejectedValue(new Error('error1'));
    await expect(getPipelinesCR('namespace', 'dspa')).rejects.toThrow('error1');
    expect(k8sGetResourceDSPipelineKindMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceDSPipelineKindMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: 'dspa', ns: 'namespace', queryParams: {} },
    });
  });
});

describe('deletePipelineCR', () => {
  it('should delete pipeline CR Successfully', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deletePipelineCR('namespace', 'dspa');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: 'dspa', ns: 'namespace', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should fail to delete pipeline ', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deletePipelineCR('namespace', 'dspa');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: 'dspa', ns: 'namespace', queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deletePipelineCR('namespace', 'dspa')).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: 'dspa', ns: 'namespace', queryParams: {} },
    });
  });
});
