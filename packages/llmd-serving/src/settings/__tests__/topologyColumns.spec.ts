import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType, getConfigTopologyType, TopologyTypeLabels } from '../../types';
import { isConfigEnabled } from '../../utils';

const nameSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b));

const enabledSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => Number(isConfigEnabled(a)) - Number(isConfigEnabled(b));

const topologyTypeSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => {
  const typeA = getConfigTopologyType(a);
  const typeB = getConfigTopologyType(b);
  const labelA = typeA ? TopologyTypeLabels[typeA] : '';
  const labelB = typeB ? TopologyTypeLabels[typeB] : '';
  return labelA.localeCompare(labelB);
};

describe('Topology configurations table columns', () => {
  describe('Name column sort', () => {
    it('should sort by display name alphabetically', () => {
      const configA = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-a',
        displayName: 'Alpha Config',
        topologyType: TopologyType.SINGLE_NODE,
      });
      const configB = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-b',
        displayName: 'Beta Config',
        topologyType: TopologyType.SINGLE_NODE,
      });

      expect(nameSortFn(configA, configB)).toBeLessThan(0);
      expect(nameSortFn(configB, configA)).toBeGreaterThan(0);
      expect(nameSortFn(configA, configA)).toBe(0);
    });
  });

  describe('Enabled column sort', () => {
    it('should sort disabled before enabled', () => {
      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
        topologyType: TopologyType.SINGLE_NODE,
      });
      const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'disabled-config',
        topologyType: TopologyType.SINGLE_NODE,
        disabled: true,
      });

      expect(enabledSortFn(disabledConfig, enabledConfig)).toBeLessThan(0);
      expect(enabledSortFn(enabledConfig, disabledConfig)).toBeGreaterThan(0);
      expect(enabledSortFn(enabledConfig, enabledConfig)).toBe(0);
    });
  });

  describe('Topology type column sort', () => {
    it('should sort by topology type label alphabetically', () => {
      const multiNodeConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'multi-node',
        topologyType: TopologyType.MULTI_NODE,
      });
      const singleNodeConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'single-node',
        topologyType: TopologyType.SINGLE_NODE,
      });

      expect(topologyTypeSortFn(multiNodeConfig, singleNodeConfig)).toBeLessThan(0);
      expect(topologyTypeSortFn(singleNodeConfig, multiNodeConfig)).toBeGreaterThan(0);
    });

    it('should handle configs without a topology type', () => {
      const withType = mockLLMInferenceServiceConfigK8sResource({
        name: 'with-type',
        topologyType: TopologyType.SINGLE_NODE,
      });
      const withoutType = mockLLMInferenceServiceConfigK8sResource({
        name: 'without-type',
      });

      expect(topologyTypeSortFn(withoutType, withType)).toBeLessThan(0);
    });
  });
});
