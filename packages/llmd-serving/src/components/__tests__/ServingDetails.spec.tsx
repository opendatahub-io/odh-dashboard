import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { useFetchLLMInferenceServiceConfigs } from '../../api/LLMInferenceServiceConfigs';
import { useServingDetailsData } from '../ServingDetails';

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useFetchLLMInferenceServiceConfigs: jest.fn(),
}));

const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(useFetchLLMInferenceServiceConfigs);

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HostApiCoreContext.Provider value={{ dashboardNamespace: 'opendatahub' } as HostApiCoreServices}>
    {children}
  </HostApiCoreContext.Provider>
);

describe('useServingDetailsData', () => {
  it('fetches serving details from the host dashboard namespace', () => {
    renderHook(() => useServingDetailsData(), { wrapper });

    expect(mockUseFetchLLMInferenceServiceConfigs).toHaveBeenCalledWith('opendatahub');
  });
});
