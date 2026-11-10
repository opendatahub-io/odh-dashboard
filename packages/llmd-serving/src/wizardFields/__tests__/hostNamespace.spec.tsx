import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import {
  useFetchLLMInferenceServiceConfig,
  useFetchLLMInferenceServiceConfigs,
  useFetchRouterConfigs,
  useFetchTopologyConfigs,
} from '../../api/LLMInferenceServiceConfigs';
import { useAcceleratorConfigData } from '../AcceleratorConfigField';
import { useAdvancedRoutingData } from '../AdvancedRoutingField';
import { useLLMConfigOptions } from '../LlmConfigOptionsField';
import { useTopologyTypeData } from '../TopologyTypeField';

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useFetchLLMInferenceServiceConfig: jest.fn(),
  useFetchLLMInferenceServiceConfigs: jest.fn(),
  useFetchRouterConfigs: jest.fn(),
  useFetchTopologyConfigs: jest.fn(),
}));

const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(useFetchLLMInferenceServiceConfigs);
const mockUseFetchRouterConfigs = jest.mocked(useFetchRouterConfigs);
const mockUseFetchTopologyConfigs = jest.mocked(useFetchTopologyConfigs);

beforeEach(() => {
  jest.clearAllMocks();
  const configList = { data: [], loaded: true, error: undefined, refresh: jest.fn() };
  mockUseFetchLLMInferenceServiceConfigs.mockReturnValue(configList);
  mockUseFetchRouterConfigs.mockReturnValue(configList);
  mockUseFetchTopologyConfigs.mockReturnValue(configList);
  jest.mocked(useFetchLLMInferenceServiceConfig).mockReturnValue({
    data: null,
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  });
});

describe('LLM-d wizard host namespace', () => {
  it.each([
    ['accelerator', useAcceleratorConfigData, mockUseFetchLLMInferenceServiceConfigs],
    ['routing', useAdvancedRoutingData, mockUseFetchRouterConfigs],
    ['topology', useTopologyTypeData, mockUseFetchTopologyConfigs],
    ['runtime options', useLLMConfigOptions, mockUseFetchLLMInferenceServiceConfigs],
  ] as const)(
    'should fetch %s configs from the host namespace without main dashboard Redux',
    (_field, useData, fetchConfigs) => {
      let coreApi = {
        dashboardNamespace: 'custom-dashboard',
        checkAccess: jest.fn(),
        trackEvent: jest.fn(),
        fetchDashboardConfig: jest.fn(),
        fetchClusterSettings: jest.fn(),
        updateClusterSettings: jest.fn(),
      };
      const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <HostApiCoreContext.Provider value={coreApi}>{children}</HostApiCoreContext.Provider>
      );

      const { rerender } = renderHook(() => useData(), { wrapper: Wrapper });
      expect(fetchConfigs).toHaveBeenLastCalledWith('custom-dashboard');

      coreApi = { ...coreApi, dashboardNamespace: 'resolved-dashboard' };
      rerender();
      expect(fetchConfigs).toHaveBeenLastCalledWith('resolved-dashboard');
    },
  );
});
