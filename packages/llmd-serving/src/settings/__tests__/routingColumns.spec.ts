import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { RoutingType } from '../../types';
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
        routingType: RoutingType.SCHEDULER,
      });
      const configB = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-b',
        displayName: 'Beta Config',
        routingType: RoutingType.SCHEDULER,
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
        routingType: RoutingType.SCHEDULER,
      });
      const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'disabled-config',
        routingType: RoutingType.SCHEDULER,
        disabled: true,
      });

      expect(sortFn(enabledConfig, disabledConfig, 'enabled')).toBeLessThan(0);
      expect(sortFn(disabledConfig, enabledConfig, 'enabled')).toBeGreaterThan(0);
      expect(sortFn(enabledConfig, enabledConfig, 'enabled')).toBe(0);
    });
  });

  describe('Routing type column sort', () => {
    it('should have a sort comparator on the Routing type column', () => {
      getSortFn('routingType');
    });

    it('should sort by routing type label alphabetically', () => {
      const sortFn = getSortFn('routingType');
      const schedulerConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'scheduler-config',
        routingType: RoutingType.SCHEDULER,
      });
      const httpRouteConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'http-route-config',
        routingType: RoutingType.HTTP_ROUTE,
      });

      // "HTTPRoute" < "Scheduler"
      expect(sortFn(httpRouteConfig, schedulerConfig, 'routingType')).toBeLessThan(0);
      expect(sortFn(schedulerConfig, httpRouteConfig, 'routingType')).toBeGreaterThan(0);
    });

    it('should handle configs without a routing type', () => {
      const sortFn = getSortFn('routingType');
      const withType = mockLLMInferenceServiceConfigK8sResource({
        name: 'with-type',
        routingType: RoutingType.SCHEDULER,
      });
      const withoutType = mockLLMInferenceServiceConfigK8sResource({
        name: 'without-type',
      });

      expect(sortFn(withoutType, withType, 'routingType')).toBeLessThan(0);
    });
  });
});
