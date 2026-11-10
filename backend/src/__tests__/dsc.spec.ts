import { DataScienceClusterKind, KubeFastifyInstance, ManagementState } from '../types';
import { fetchClusterStatus } from '../utils/dsc';

describe('fetchClusterStatus', () => {
  const mockListClusterCustomObject = jest.fn();
  const mockFastify = {
    kube: { customObjectsApi: { listClusterCustomObject: mockListClusterCustomObject } },
    log: { error: jest.fn() },
  } as unknown as KubeFastifyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<{
    featureStore: ManagementState;
    dataRegistry: ManagementState;
  }>([
    { featureStore: 'Managed', dataRegistry: 'Removed' },
    { featureStore: 'Removed', dataRegistry: 'Managed' },
    { featureStore: 'Removed', dataRegistry: 'Removed' },
    { featureStore: 'Managed', dataRegistry: 'Managed' },
  ])(
    'normalizes independent converted v2 data lifecycle states: Feature Store $featureStore / Data Registry $dataRegistry',
    async ({ featureStore, dataRegistry }) => {
      const aggregateDataState: ManagementState =
        featureStore === 'Managed' || dataRegistry === 'Managed' ? 'Managed' : 'Removed';
      const dsc: DataScienceClusterKind = {
        apiVersion: 'datasciencecluster.opendatahub.io/v2',
        kind: 'DataScienceCluster',
        metadata: { name: 'default-dsc' },
        spec: {
          components: {
            feastoperator: {
              managementState: featureStore,
              dataRegistry: { managementState: dataRegistry },
            },
          },
        },
        status: {
          components: {
            feastoperator: {
              managementState: aggregateDataState,
              releases: [
                { name: 'Feast', version: '0.64.0', repoUrl: 'https://github.com/feast-dev/feast' },
              ],
            },
            modelregistry: { managementState: 'Managed' },
            workbenches: { managementState: 'Removed' },
          },
          conditions: [],
          release: { name: 'OpenShift AI', version: '3.6.0' },
        },
      };
      mockListClusterCustomObject.mockResolvedValue({
        body: {
          apiVersion: 'datasciencecluster.opendatahub.io/v2',
          kind: 'DataScienceClusterList',
          items: [dsc],
        },
      });

      const result = await fetchClusterStatus(mockFastify);

      expect(mockListClusterCustomObject).toHaveBeenCalledWith(
        'datasciencecluster.opendatahub.io',
        'v2',
        'datascienceclusters',
      );
      expect(result).toEqual({
        ...dsc.status,
        components: {
          ...dsc.status.components,
          featureStore: { managementState: featureStore },
          dataRegistry: { managementState: dataRegistry },
        },
      });
      // The shared operand and unrelated v2 statuses retain their existing objects and metadata.
      expect(result.components?.feastoperator).toBe(dsc.status.components?.feastoperator);
      expect(result.components?.modelregistry).toBe(dsc.status.components?.modelregistry);
    },
  );

  it.each<{
    name: string;
    spec: DataScienceClusterKind['spec'];
    featureStore: ManagementState;
    dataRegistry: ManagementState;
  }>([
    { name: 'absent components', spec: {}, featureStore: 'Removed', dataRegistry: 'Removed' },
    {
      name: 'absent feastoperator',
      spec: { components: {} },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'empty feastoperator',
      spec: { components: { feastoperator: {} } },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'empty data registry child',
      spec: { components: { feastoperator: { dataRegistry: {} } } },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'absent Data Registry with Feature Store managed',
      spec: { components: { feastoperator: { managementState: 'Managed' } } },
      featureStore: 'Managed',
      dataRegistry: 'Removed',
    },
    {
      name: 'absent Feature Store with Data Registry managed',
      spec: { components: { feastoperator: { dataRegistry: { managementState: 'Managed' } } } },
      featureStore: 'Removed',
      dataRegistry: 'Managed',
    },
  ])(
    'should default $name to Removed without using shared feastoperator status',
    async ({ spec, featureStore, dataRegistry }) => {
      const dsc: DataScienceClusterKind = {
        apiVersion: 'datasciencecluster.opendatahub.io/v2',
        kind: 'DataScienceCluster',
        metadata: { name: 'default-dsc' },
        spec,
        status: {
          components: { feastoperator: { managementState: 'Managed' } },
          conditions: [],
        },
      };
      mockListClusterCustomObject.mockResolvedValue({
        body: { kind: 'DataScienceClusterList', items: [dsc] },
      });

      const result = await fetchClusterStatus(mockFastify);

      expect(result.components?.featureStore).toEqual({ managementState: featureStore });
      expect(result.components?.dataRegistry).toEqual({ managementState: dataRegistry });
    },
  );

  it('should preserve Unmanaged child states from the v2 spec', async () => {
    const dsc: DataScienceClusterKind = {
      apiVersion: 'datasciencecluster.opendatahub.io/v2',
      kind: 'DataScienceCluster',
      metadata: { name: 'default-dsc' },
      spec: {
        components: {
          feastoperator: {
            managementState: 'Unmanaged',
            dataRegistry: { managementState: 'Unmanaged' },
          },
        },
      },
      status: { conditions: [] },
    };
    mockListClusterCustomObject.mockResolvedValue({
      body: { kind: 'DataScienceClusterList', items: [dsc] },
    });

    const result = await fetchClusterStatus(mockFastify);

    expect(result.components).toEqual({
      featureStore: { managementState: 'Unmanaged' },
      dataRegistry: { managementState: 'Unmanaged' },
    });
  });
});
