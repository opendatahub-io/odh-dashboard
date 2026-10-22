import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { AppContext } from '#~/app/AppContext';
import { MODEL_SERVING_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import ServingRuntimeDetails from '#~/pages/modelServing/screens/projects/ServingRuntimeDetails';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
}));

jest.mock('#~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState', () => ({
  __esModule: true,
  default: jest.fn(() => ({ formData: { count: 0, useExistingSettings: false } })),
}));

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileConfig', () => ({
  useHardwareProfileConfig: jest.fn(),
}));

const mockUseHardwareProfileConfig = jest.mocked(useHardwareProfileConfig);

describe('ServingRuntimeDetails', () => {
  it("should request the deployment's own resources and show them with its DRA hardware profile", () => {
    const resources = {
      requests: { cpu: '2', memory: '8Gi' },
      limits: { cpu: '4', memory: '16Gi' },
    };
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      displayName: 'DRA Profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const inferenceService = mockInferenceServiceK8sResource({
      resources,
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
    });
    mockUseHardwareProfileConfig.mockReturnValue({
      formData: { selectedProfile: draProfile, useExistingSettings: true, resources },
      initialHardwareProfile: draProfile,
      initialResources: resources,
      existingBinding: { name: 'dra-profile', namespace: 'opendatahub' },
      excludeDRAProfiles: true,
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });

    render(
      <AppContext.Provider
        value={{
          buildStatuses: [],
          dashboardConfig: mockDashboardConfig({}),
          storageClasses: [],
          isRHOAI: false,
        }}
      >
        <ServingRuntimeDetails obj={mockServingRuntimeK8sResource({})} isvc={inferenceService} />
      </AppContext.Provider>,
    );

    expect(mockUseHardwareProfileConfig).toHaveBeenCalledWith(
      'dra-profile',
      resources,
      inferenceService.spec.predictor.tolerations,
      inferenceService.spec.predictor.nodeSelector,
      MODEL_SERVING_VISIBILITY,
      undefined,
      'opendatahub',
    );
    expect(screen.getByText('2 CPUs, 8GiB Memory requested')).toBeInTheDocument();
    expect(screen.getByText('4 CPUs, 16GiB Memory limit')).toBeInTheDocument();
    expect(screen.getByText('DRA Profile')).toBeInTheDocument();
  });
});
