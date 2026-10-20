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
            data: { managementState: aggregateDataState },
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
    },
  );

  it('treats absent v3 data children as unavailable instead of using aggregate data state', async () => {
    const dsc: DataScienceClusterKind = {
      apiVersion: 'datasciencecluster.opendatahub.io/v3',
      kind: 'DataScienceCluster',
      metadata: { name: 'default-dsc' },
      spec: { components: { data: {} } },
      status: {
        components: { data: { managementState: 'Managed' } },
        conditions: [],
      },
    };
    mockListClusterCustomObject.mockResolvedValue({
      body: { kind: 'DataScienceClusterList', items: [dsc] },
    });

    const result = await fetchClusterStatus(mockFastify);

    expect(result.components?.featureStore).toEqual({});
    expect(result.components?.dataRegistry).toEqual({});
  });
});
