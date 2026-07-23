import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import { columns } from '../RoutingConfigurationsTable';

type ConfigResource = ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>;
type SortFn = (a: ConfigResource, b: ConfigResource, key: string) => number;

const getSortFn = (field: string): SortFn => {
  const column = columns.find((c) => c.field === field);
  expect(column).toBeDefined();
  expect(typeof column?.sortable).toBe('function');
  return column?.sortable as SortFn;
};

describe('Routing configurations table columns', () => {
  describe('Name column sort', () => {
    it('should have a sort comparator on the Name column', () => {
      getSortFn('name');
    });

    it('should sort by display name alphabetically', () => {
      const sortFn = getSortFn('name');
      const configA = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-a',
        displayName: 'Alpha Config',
      });
      const configB = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-b',
        displayName: 'Beta Config',
      });

      expect(sortFn(configA, configB, 'name')).toBeLessThan(0);
      expect(sortFn(configB, configA, 'name')).toBeGreaterThan(0);
      expect(sortFn(configA, configA, 'name')).toBe(0);
    });
  });

  describe('Enabled column sort', () => {
    it('should have a sort comparator on the Enabled column', () => {
      getSortFn('enabled');
    });

    it('should sort enabled before disabled', () => {
      const sortFn = getSortFn('enabled');
      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
      });
      const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'disabled-config',
        disabled: true,
      });

      expect(sortFn(enabledConfig, disabledConfig, 'enabled')).toBeLessThan(0);
      expect(sortFn(disabledConfig, enabledConfig, 'enabled')).toBeGreaterThan(0);
      expect(sortFn(enabledConfig, enabledConfig, 'enabled')).toBe(0);
    });

    it('should treat unsupported-unaccepted configs as effectively disabled', () => {
      const sortFn = getSortFn('enabled');
      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
      });
      const unsupportedConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'unsupported-config',
        unsupported: true,
      });

      expect(sortFn(enabledConfig, unsupportedConfig, 'enabled')).toBeLessThan(0);
      expect(sortFn(unsupportedConfig, enabledConfig, 'enabled')).toBeGreaterThan(0);
    });
  });

  describe('Topology type column sort', () => {
    it('should have a sort comparator on the Topology type column', () => {
      getSortFn('topologyType');
    });

    it('should sort by supported topologies label alphabetically', () => {
      const sortFn = getSortFn('topologyType');
      const singleNodeConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'single-node-config',
        supportedTopologies: [TopologyType.SINGLE_NODE],
      });
      const multiNodeConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'multi-node-config',
        supportedTopologies: [TopologyType.MULTI_NODE],
      });

      // "Multi-node" < "Single-node"
      expect(sortFn(multiNodeConfig, singleNodeConfig, 'topologyType')).toBeLessThan(0);
      expect(sortFn(singleNodeConfig, multiNodeConfig, 'topologyType')).toBeGreaterThan(0);
    });

    it('should handle configs without supported topologies as All', () => {
      const sortFn = getSortFn('topologyType');
      const withTopologies = mockLLMInferenceServiceConfigK8sResource({
        name: 'with-topologies',
        supportedTopologies: [TopologyType.SINGLE_NODE],
      });
      const withoutTopologies = mockLLMInferenceServiceConfigK8sResource({
        name: 'without-topologies',
      });

      // "All" < "Single-node"
      expect(sortFn(withoutTopologies, withTopologies, 'topologyType')).toBeLessThan(0);
    });
  });
});
