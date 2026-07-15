import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { RoutingType, getConfigRoutingType, RoutingTypeLabels } from '../../types';
import { isConfigEnabled } from '../../utils';

const nameSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b));

const enabledSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => Number(isConfigEnabled(a)) - Number(isConfigEnabled(b));

const routingTypeSortFn = (
  a: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
  b: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>,
) => {
  const typeA = getConfigRoutingType(a);
  const typeB = getConfigRoutingType(b);
  const labelA = typeA ? RoutingTypeLabels[typeA] : '';
  const labelB = typeB ? RoutingTypeLabels[typeB] : '';
  return labelA.localeCompare(labelB);
};

describe('Routing configurations table columns', () => {
  describe('Name column sort', () => {
    it('should sort by display name alphabetically', () => {
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

      expect(nameSortFn(configA, configB)).toBeLessThan(0);
      expect(nameSortFn(configB, configA)).toBeGreaterThan(0);
      expect(nameSortFn(configA, configA)).toBe(0);
    });
  });

  describe('Enabled column sort', () => {
    it('should sort disabled before enabled', () => {
      const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'enabled-config',
        routingType: RoutingType.SCHEDULER,
      });
      const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'disabled-config',
        routingType: RoutingType.SCHEDULER,
        disabled: true,
      });

      expect(enabledSortFn(disabledConfig, enabledConfig)).toBeLessThan(0);
      expect(enabledSortFn(enabledConfig, disabledConfig)).toBeGreaterThan(0);
      expect(enabledSortFn(enabledConfig, enabledConfig)).toBe(0);
    });
  });

  describe('Routing type column sort', () => {
    it('should sort by routing type label alphabetically', () => {
      const schedulerConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'scheduler-config',
        routingType: RoutingType.SCHEDULER,
      });
      const httpRouteConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'http-route-config',
        routingType: RoutingType.HTTP_ROUTE,
      });

      // "HTTPRoute" < "Scheduler"
      expect(routingTypeSortFn(httpRouteConfig, schedulerConfig)).toBeLessThan(0);
      expect(routingTypeSortFn(schedulerConfig, httpRouteConfig)).toBeGreaterThan(0);
    });

    it('should handle configs without a routing type', () => {
      const withType = mockLLMInferenceServiceConfigK8sResource({
        name: 'with-type',
        routingType: RoutingType.SCHEDULER,
      });
      const withoutType = mockLLMInferenceServiceConfigK8sResource({
        name: 'without-type',
      });

      expect(routingTypeSortFn(withoutType, withType)).toBeLessThan(0);
    });
  });
});
