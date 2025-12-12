import { ClusterQueueKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { ContainerResourceAttributes } from '@odh-dashboard/internal/types';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import {
  getAllConsumedResources,
  convertToBaseUnit,
  getDefaultPodContainerName,
  formatMetricLabel,
  formatMetricValue,
} from '../utils';

const createMockClusterQueue = (overrides?: Partial<ClusterQueueKind>): ClusterQueueKind => ({
  ...mockClusterQueueK8sResource({}),
  ...overrides,
});

const createMockPod = (overrides?: Partial<PodKind>): PodKind => ({
  ...mockPodK8sResource({ name: 'test-pod', namespace: 'test-namespace' }),
  ...overrides,
  metadata: {
    ...mockPodK8sResource({ name: 'test-pod', namespace: 'test-namespace' }).metadata,
    ...overrides?.metadata,
  },
  spec: {
    ...mockPodK8sResource({ name: 'test-pod', namespace: 'test-namespace' }).spec,
    ...overrides?.spec,
    containers:
      overrides?.spec?.containers ||
      mockPodK8sResource({ name: 'test-pod', namespace: 'test-namespace' }).spec.containers,
  },
});

describe('convertToBaseUnit', () => {
  describe('cpu conversions', () => {
    it('should convert CPU cores to millicores', () => {
      expect(convertToBaseUnit('2', 'cpu')).toBe(2000);
      expect(convertToBaseUnit('0.5', 'cpu')).toBe(500);
    });

    it('should handle CPU millicores', () => {
      expect(convertToBaseUnit('1000m', 'cpu')).toBe(1000);
      expect(convertToBaseUnit('500m', 'cpu')).toBe(500);
      expect(convertToBaseUnit('100m', 'cpu')).toBe(100);
    });

    it('should handle numeric CPU values', () => {
      expect(convertToBaseUnit(2, 'cpu')).toBe(2);
      expect(convertToBaseUnit(0.5, 'cpu')).toBe(0.5);
    });
  });

  describe('memory conversions', () => {
    it('should convert Gi to bytes', () => {
      expect(convertToBaseUnit('1Gi', 'memory')).toBe(1073741824);
      expect(convertToBaseUnit('8Gi', 'memory')).toBe(8589934592);
      expect(convertToBaseUnit('64Gi', 'memory')).toBe(68719476736);
    });

    it('should convert Mi to bytes', () => {
      expect(convertToBaseUnit('1Mi', 'memory')).toBe(1048576);
      expect(convertToBaseUnit('512Mi', 'memory')).toBe(536870912);
    });

    it('should convert Ti to bytes', () => {
      expect(convertToBaseUnit('1Ti', 'memory')).toBe(1099511627776);
    });

    it('should convert Ki to bytes', () => {
      expect(convertToBaseUnit('1Ki', 'memory')).toBe(1024);
    });

    it('should handle numeric memory values', () => {
      expect(convertToBaseUnit(1024, 'memory')).toBe(1024);
    });
  });

  describe('other resources', () => {
    it('should handle GPU as plain number', () => {
      expect(convertToBaseUnit('8', 'nvidia.com/gpu')).toBe(8);
      expect(convertToBaseUnit('2', 'nvidia.com/gpu')).toBe(2);
    });

    it('should handle numeric GPU values', () => {
      expect(convertToBaseUnit(4, 'nvidia.com/gpu')).toBe(4);
    });

    it('should handle invalid strings as 0', () => {
      expect(convertToBaseUnit('invalid', 'nvidia.com/gpu')).toBe(0);
      expect(convertToBaseUnit('abc', 'custom-resource')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings for other resources', () => {
      expect(convertToBaseUnit('', 'nvidia.com/gpu')).toBe(0);
    });

    it('should handle zero values', () => {
      expect(convertToBaseUnit('0', 'cpu')).toBe(0);
      expect(convertToBaseUnit('0Gi', 'memory')).toBe(0);
      expect(convertToBaseUnit(0, 'cpu')).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(convertToBaseUnit('0.5', 'cpu')).toBe(500);
      expect(convertToBaseUnit('1.5Gi', 'memory')).toBe(1610612736);
    });
  });
});

describe('getAllConsumedResources', () => {
  describe('basic functionality', () => {
    it('should return empty array when flavorsUsage is missing', () => {
      const clusterQueue = createMockClusterQueue({
        status: {},
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toEqual([]);
    });

    it('should return empty array when flavorsUsage is empty', () => {
      const clusterQueue = createMockClusterQueue({
        status: {
          flavorsUsage: [],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toEqual([]);
    });

    it('should return empty array when resourceGroups is missing', () => {
      const clusterQueue = mockClusterQueueK8sResource({ hasResourceGroups: false });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toEqual([]);
    });

    it('should return empty array when resourceGroups is empty', () => {
      const clusterQueue = mockClusterQueueK8sResource({ hasResourceGroups: false });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toEqual([]);
    });
  });

  describe('resource extraction and formatting', () => {
    it('should extract CPU and Memory resources correctly', () => {
      const clusterQueue = createMockClusterQueue();

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'cpu',
        label: 'CPU',
        total: '100',
        consumed: '40',
        percentage: 40,
      });
      expect(result[1]).toEqual({
        name: 'memory',
        label: 'Memory',
        total: '64Gi',
        consumed: '20Gi',
        percentage: 31,
      });
    });

    it('should handle GPU resources', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [
                ContainerResourceAttributes.CPU,
                ContainerResourceAttributes.MEMORY,
                'nvidia.com/gpu' as ContainerResourceAttributes,
              ],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [
                    { name: ContainerResourceAttributes.CPU, nominalQuota: '100' },
                    { name: ContainerResourceAttributes.MEMORY, nominalQuota: '64Gi' },
                    { name: 'nvidia.com/gpu' as ContainerResourceAttributes, nominalQuota: '8' },
                  ],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [
                { name: ContainerResourceAttributes.CPU, total: '40' },
                { name: ContainerResourceAttributes.MEMORY, total: '20Gi' },
                { name: 'nvidia.com/gpu' as ContainerResourceAttributes, total: '2' },
              ],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('cpu');
      expect(result[1].name).toBe('memory');
      expect(result[2]).toEqual({
        name: 'nvidia.com/gpu',
        label: 'nvidia.com/gpu',
        total: '8',
        consumed: '2',
        percentage: 25,
      });
    });
  });

  describe('percentage calculation', () => {
    it('should calculate percentage correctly for memory with units', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.MEMORY],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.MEMORY, nominalQuota: '50Gi' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.MEMORY, total: '8Gi' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(16);
    });

    it('should calculate percentage correctly for CPU with millicores', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: '2000m' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '500m' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(25);
    });

    it('should return 0% when quota is 0', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: 0 }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '40' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(0);
    });

    it('should handle 100% consumption', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.MEMORY],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.MEMORY, nominalQuota: '64Gi' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.MEMORY, total: '64Gi' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(100);
    });

    it('should handle over-consumption (over 100%)', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: '100' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '180' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(180);
    });

    it('should round percentage to nearest integer', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: '3' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '1' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(33); // 1/3 = 33.33% -> rounds to 33%
    });
  });

  describe('resource sorting', () => {
    it('should sort resources with CPU first, Memory second', () => {
      const clusterQueue = createMockClusterQueue();

      const result = getAllConsumedResources(clusterQueue);

      expect(result[0].name).toBe('cpu');
      expect(result[1].name).toBe('memory');
    });

    it('should place other resources after CPU and Memory', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [
                'nvidia.com/gpu' as ContainerResourceAttributes,
                ContainerResourceAttributes.MEMORY,
                ContainerResourceAttributes.CPU,
              ],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [
                    { name: 'nvidia.com/gpu' as ContainerResourceAttributes, nominalQuota: '8' },
                    { name: ContainerResourceAttributes.MEMORY, nominalQuota: '64Gi' },
                    { name: ContainerResourceAttributes.CPU, nominalQuota: '100' },
                  ],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [
                { name: 'nvidia.com/gpu' as ContainerResourceAttributes, total: '2' },
                { name: ContainerResourceAttributes.MEMORY, total: '20Gi' },
                { name: ContainerResourceAttributes.CPU, total: '40' },
              ],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('cpu');
      expect(result[1].name).toBe('memory');
      expect(result[2].name).toBe('nvidia.com/gpu');
    });
  });

  describe('label formatting', () => {
    it('should format CPU label correctly', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: '100' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '40' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result[0].label).toBe('CPU');
    });

    it('should format Memory label correctly', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.MEMORY],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.MEMORY, nominalQuota: '64Gi' }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.MEMORY, total: '20Gi' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result[0].label).toBe('Memory');
    });

    it('should not format labels for other resources', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: ['nvidia.com/gpu' as ContainerResourceAttributes],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [
                    { name: 'nvidia.com/gpu' as ContainerResourceAttributes, nominalQuota: '8' },
                  ],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: 'nvidia.com/gpu' as ContainerResourceAttributes, total: '2' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result[0].label).toBe('nvidia.com/gpu');
    });
  });

  describe('edge cases', () => {
    it('should handle missing total in flavorsUsage resource', () => {
      const clusterQueue = createMockClusterQueue({
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].consumed).toBe('0');
      expect(result[0].percentage).toBe(0);
    });

    it('should handle missing nominalQuota in spec resource', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [
                    { name: ContainerResourceAttributes.CPU } as {
                      name: ContainerResourceAttributes;
                      nominalQuota: string | number;
                    },
                  ],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '40' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe('0');
      expect(result[0].percentage).toBe(0);
    });

    it('should handle numeric values for quota and consumption', () => {
      const clusterQueue = createMockClusterQueue({
        spec: {
          resourceGroups: [
            {
              coveredResources: [ContainerResourceAttributes.CPU],
              flavors: [
                {
                  name: 'test-flavor',
                  resources: [{ name: ContainerResourceAttributes.CPU, nominalQuota: 100 }],
                },
              ],
            },
          ],
        },
        status: {
          flavorsUsage: [
            {
              name: 'test-flavor',
              resources: [{ name: ContainerResourceAttributes.CPU, total: 40 }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe('100');
      expect(result[0].consumed).toBe('40');
      expect(result[0].percentage).toBe(40);
    });

    it('should only process first occurrence of each resource', () => {
      const clusterQueue = createMockClusterQueue({
        status: {
          flavorsUsage: [
            {
              name: 'flavor-1',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '40' }],
            },
            {
              name: 'flavor-2',
              resources: [{ name: ContainerResourceAttributes.CPU, total: '60' }],
            },
          ],
        },
      });

      const result = getAllConsumedResources(clusterQueue);

      expect(result).toHaveLength(1);
      expect(result[0].consumed).toBe('40');
    });
  });
});

describe('getDefaultPodContainerName', () => {
  describe('null/undefined pod handling', () => {
    it('should return empty string when pod is null', () => {
      expect(getDefaultPodContainerName(null)).toBe('');
    });

    it('should return empty string when pod is undefined', () => {
      expect(getDefaultPodContainerName(undefined as unknown as PodKind | null)).toBe('');
    });
  });

  describe('pod with no containers', () => {
    it('should return empty string when pod has no containers', () => {
      const pod = createMockPod({
        spec: {
          containers: [],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('');
    });
  });

  describe('pod with single container', () => {
    it('should return first container name when no default-container annotation', () => {
      const pod = createMockPod({
        spec: {
          containers: [
            {
              name: 'my-container',
              image: 'test-image:latest',
              env: [],
            },
          ],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('my-container');
    });

    it('should return first container name when default-container annotation is empty', () => {
      const pod = createMockPod({
        metadata: {
          name: 'test-pod',
          namespace: 'test-namespace',
          uid: 'test-uid',
          annotations: {
            'kubectl.kubernetes.io/default-container': '',
          },
        },
        spec: {
          containers: [
            {
              name: 'my-container',
              image: 'test-image:latest',
              env: [],
            },
          ],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('my-container');
    });
  });

  describe('pod with multiple containers', () => {
    it('should return first container name when no default-container annotation', () => {
      const pod = createMockPod({
        spec: {
          containers: [
            {
              name: 'container-1',
              image: 'test-image-1:latest',
              env: [],
            },
            {
              name: 'container-2',
              image: 'test-image-2:latest',
              env: [],
            },
            {
              name: 'container-3',
              image: 'test-image-3:latest',
              env: [],
            },
          ],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('container-1');
    });

    it('should return container name from default-container annotation when present', () => {
      const pod = createMockPod({
        metadata: {
          name: 'test-pod',
          namespace: 'test-namespace',
          uid: 'test-uid',
          annotations: {
            'kubectl.kubernetes.io/default-container': 'container-2',
          },
        },
        spec: {
          containers: [
            {
              name: 'container-1',
              image: 'test-image-1:latest',
              env: [],
            },
            {
              name: 'container-2',
              image: 'test-image-2:latest',
              env: [],
            },
            {
              name: 'container-3',
              image: 'test-image-3:latest',
              env: [],
            },
          ],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('container-2');
    });

    it('should return first container name when default-container annotation does not match any container', () => {
      const pod = createMockPod({
        metadata: {
          name: 'test-pod',
          namespace: 'test-namespace',
          uid: 'test-uid',
          annotations: {
            'kubectl.kubernetes.io/default-container': 'non-existent-container',
          },
        },
        spec: {
          containers: [
            {
              name: 'container-1',
              image: 'test-image-1:latest',
              env: [],
            },
            {
              name: 'container-2',
              image: 'test-image-2:latest',
              env: [],
            },
          ],
        },
      });

      expect(getDefaultPodContainerName(pod)).toBe('container-1');
    });
  });
});

describe('formatMetricLabel', () => {
  it('should convert snake_case to readable label', () => {
    expect(formatMetricLabel('grad_norm')).toBe('Grad norm');
    expect(formatMetricLabel('learning_rate')).toBe('Learning rate');
    expect(formatMetricLabel('total_batches')).toBe('Total batches');
    expect(formatMetricLabel('total_samples')).toBe('Total samples');
  });

  it('should convert camelCase to readable label', () => {
    expect(formatMetricLabel('learningRate')).toBe('Learning rate');
    expect(formatMetricLabel('totalBatches')).toBe('Total batches');
  });

  it('should handle multiple underscores', () => {
    expect(formatMetricLabel('train_loss_value')).toBe('Train loss value');
    expect(formatMetricLabel('trainLossValue')).toBe('Train loss value');
  });

  it('should capitalize single words', () => {
    expect(formatMetricLabel('loss')).toBe('Loss');
    expect(formatMetricLabel('accuracy')).toBe('Accuracy');
    expect(formatMetricLabel('throughput')).toBe('Throughput');
  });

  it('should handle already capitalized words', () => {
    expect(formatMetricLabel('Loss')).toBe('Loss');
    expect(formatMetricLabel('LOSS')).toBe('Loss');
  });

  it('should handle empty string', () => {
    expect(formatMetricLabel('')).toBe('');
  });

  it('should handle single character', () => {
    expect(formatMetricLabel('a')).toBe('A');
  });
});

describe('formatMetricValue', () => {
  describe('null and undefined handling', () => {
    it('should return dash for null', () => {
      expect(formatMetricValue(null)).toBe('-');
    });

    it('should return dash for undefined', () => {
      expect(formatMetricValue(undefined)).toBe('-');
    });
  });

  describe('number handling', () => {
    it('should convert integers to string', () => {
      expect(formatMetricValue(42)).toBe('42');
      expect(formatMetricValue(0)).toBe('0');
      expect(formatMetricValue(-10)).toBe('-10');
    });

    it('should convert floats to string', () => {
      expect(formatMetricValue(3.14159)).toBe('3.14159');
      expect(formatMetricValue(0.2344)).toBe('0.2344');
      expect(formatMetricValue(0.8993774)).toBe('0.8993774');
    });
  });

  describe('string handling', () => {
    it('should return string values as-is', () => {
      expect(formatMetricValue('1.7261')).toBe('1.7261');
      expect(formatMetricValue('22.83')).toBe('22.83');
      expect(formatMetricValue('some text')).toBe('some text');
    });

    it('should handle empty string', () => {
      expect(formatMetricValue('')).toBe('');
    });
  });
});
