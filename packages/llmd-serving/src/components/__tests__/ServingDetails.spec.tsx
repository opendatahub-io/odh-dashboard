import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { useFetchLLMInferenceServiceConfigs } from '../../api/LLMInferenceServiceConfigs';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import type { LLMdDeployment } from '../../types';
import LLMInferenceServiceServingDetails, { useServingDetailsData } from '../ServingDetails';

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useFetchLLMInferenceServiceConfigs: jest.fn(),
}));

const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(useFetchLLMInferenceServiceConfigs);

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HostApiCoreContext.Provider value={{ dashboardNamespace: 'opendatahub' } as HostApiCoreServices}>
    {children}
  </HostApiCoreContext.Provider>
);

describe('LLMInferenceServiceServingDetails', () => {
  it.each([true, false])(
    'should show the resolved config name, version and status when isLLMd is %s',
    (isLLMd) => {
      const deployment: LLMdDeployment = {
        modelServingPlatformId: 'llmd-serving',
        model: mockLLMInferenceServiceK8sResource({ isLLMd }),
        server: mockLLMInferenceServiceConfigK8sResource({
          displayName: 'My config',
          runtimeVersion: 'v0.8.2',
          templateName: 'parent-config',
        }),
      };
      render(
        <LLMInferenceServiceServingDetails
          deployment={deployment}
          data={standardUseFetchStateObject({
            data: [
              mockLLMInferenceServiceConfigK8sResource({
                name: 'parent-config',
                runtimeVersion: 'v0.9.1',
              }),
            ],
            loaded: true,
          })}
        />,
      );

      expect(screen.getByText('My config')).toBeInTheDocument();
      expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('v0.8.2');
      expect(screen.getByTestId('serving-runtime-version-status-label')).toHaveTextContent(
        'Outdated',
      );
      expect(screen.queryByText('Distributed inference with llm-d')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom LLMInferenceService')).not.toBeInTheDocument();
    },
  );

  it('should show llm-d without a resolved config when a scheduler is present', () => {
    render(
      <LLMInferenceServiceServingDetails
        deployment={{
          modelServingPlatformId: 'llmd-serving',
          model: mockLLMInferenceServiceK8sResource({}),
        }}
      />,
    );

    expect(screen.getByText('Distributed inference with llm-d')).toBeInTheDocument();
  });

  it('should show llm-d without a resolved config when the scheduler is empty', () => {
    const model = mockLLMInferenceServiceK8sResource({});
    model.spec.router = { scheduler: {} };
    render(
      <LLMInferenceServiceServingDetails
        deployment={{ modelServingPlatformId: 'llmd-serving', model }}
      />,
    );

    expect(screen.getByText('Distributed inference with llm-d')).toBeInTheDocument();
  });

  it.each([false, true])(
    'should show the custom fallback without a scheduler (router absent: %s)',
    (noRouter) => {
      const model = mockLLMInferenceServiceK8sResource({ isLLMd: false });
      if (noRouter) {
        delete model.spec.router;
      }
      render(
        <LLMInferenceServiceServingDetails
          deployment={{ modelServingPlatformId: 'llmd-serving', model }}
        />,
      );

      expect(screen.getByText('Custom LLMInferenceService')).toBeInTheDocument();
      expect(screen.queryByText('Distributed inference with llm-d')).not.toBeInTheDocument();
      expect(screen.queryByTestId('serving-runtime-version-label')).not.toBeInTheDocument();
    },
  );
});

describe('useServingDetailsData', () => {
  it('fetches serving details from the host dashboard namespace', () => {
    renderHook(() => useServingDetailsData(), { wrapper });

    expect(mockUseFetchLLMInferenceServiceConfigs).toHaveBeenCalledWith('opendatahub');
  });
});
