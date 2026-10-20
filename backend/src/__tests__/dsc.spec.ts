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
    'normalizes independent v3 data lifecycle states: Feature Store $featureStore / Data Registry $dataRegistry',
    async ({ featureStore, dataRegistry }) => {
      const aggregateDataState: ManagementState =
        featureStore === 'Managed' || dataRegistry === 'Managed' ? 'Managed' : 'Removed';
      const dsc: DataScienceClusterKind = {
        apiVersion: 'datasciencecluster.opendatahub.io/v3',
        kind: 'DataScienceCluster',
        metadata: { name: 'default-dsc' },
        spec: {
          components: {
            data: {
              featureStore: { managementState: featureStore },
              dataRegistry: { managementState: dataRegistry },
            },
          },
        },
        status: {
          components: {
            data: {
              managementState: aggregateDataState,
              releases: [
                { name: 'Feast', version: '0.64.0', repoUrl: 'https://github.com/feast-dev/feast' },
              ],
            },
            aiHub: { managementState: 'Managed' },
          },
          conditions: [],
        },
      };
      mockListClusterCustomObject.mockResolvedValue({
        body: {
          apiVersion: 'datasciencecluster.opendatahub.io/v3',
          kind: 'DataScienceClusterList',
          items: [dsc],
        },
      });

      const result = await fetchClusterStatus(mockFastify);

      expect(mockListClusterCustomObject).toHaveBeenCalledWith(
        'datasciencecluster.opendatahub.io',
        'v3',
        'datascienceclusters',
      );
      expect(result.components).toMatchObject({
        data: { managementState: aggregateDataState },
        dataRegistry: { managementState: dataRegistry },
        featureStore: { managementState: featureStore },
        modelregistry: { managementState: 'Managed' },
      });
      // Shared operand release metadata must survive independently of child availability.
      expect(result.components?.data).toEqual(dsc.status.components?.data);
      expect(result.components?.featureStore).toEqual({ managementState: featureStore });
      expect(result.components?.dataRegistry).toEqual({ managementState: dataRegistry });
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
      name: 'absent data',
      spec: { components: {} },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'absent data children',
      spec: { components: { data: {} } },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'empty data children',
      spec: { components: { data: { featureStore: {}, dataRegistry: {} } } },
      featureStore: 'Removed',
      dataRegistry: 'Removed',
    },
    {
      name: 'absent Data Registry with Feature Store managed',
      spec: { components: { data: { featureStore: { managementState: 'Managed' } } } },
      featureStore: 'Managed',
      dataRegistry: 'Removed',
    },
    {
      name: 'absent Feature Store with Data Registry managed',
      spec: { components: { data: { dataRegistry: { managementState: 'Managed' } } } },
      featureStore: 'Removed',
      dataRegistry: 'Managed',
    },
  ])(
    'should default $name to Removed without using aggregate data state',
    async ({ spec, featureStore, dataRegistry }) => {
      const dsc: DataScienceClusterKind = {
        apiVersion: 'datasciencecluster.opendatahub.io/v3',
        kind: 'DataScienceCluster',
        metadata: { name: 'default-dsc' },
        spec,
        status: {
          components: { data: { managementState: 'Managed' } },
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
});
