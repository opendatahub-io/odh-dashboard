import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import type { PodSpec } from '@odh-dashboard/k8s-core';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/hardware-profiles/shared';
import { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from '@odh-dashboard/hardware-profiles/shared/const';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import { useIsDRAHardwareProfileEnabled } from '@odh-dashboard/hardware-profiles/shared/useIsDRAHardwareProfileEnabled';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@odh-dashboard/hardware-profiles/shared/useIsDRAHardwareProfileEnabled', () => ({
  useIsDRAHardwareProfileEnabled: jest.fn(() => false),
}));

const mockUseIsDRAHardwareProfileEnabled = jest.mocked(useIsDRAHardwareProfileEnabled);

const mockExtractModelAvailabilityData = jest.fn();
jest.mock('../../../../src/concepts/extensionUtils', () => ({
  useResolvedDeploymentExtension: () => [
    {
      properties: {
        extractModelFormat: () => ({ name: 'test-model-format' }),
        extractReplicas: () => ({ data: 1 }),
        hardwareProfilePaths: {
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        },
        extractModelAvailabilityData: () => mockExtractModelAvailabilityData(),
      },
    },
  ],
}));

const mockUseAssignHardwareProfile = jest.fn();
jest.mock('@odh-dashboard/hardware-profiles/shared', () => {
  const { HardwareProfileFeatureVisibility } = jest.requireActual('@odh-dashboard/k8s-core');
  return {
    MODEL_SERVING_VISIBILITY: [HardwareProfileFeatureVisibility.MODEL_SERVING],
    useAssignHardwareProfile: (...args: unknown[]) => mockUseAssignHardwareProfile(...args),
  };
});

const mockUseWizardFieldExtractors = jest.fn();
jest.mock('../../deploymentWizard/useWizardFieldExtractors', () => ({
  useWizardFieldExtractors: (...args: unknown[]) => mockUseWizardFieldExtractors(...args),
}));

const mockDeployment = () => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-project',
      annotations: {
        'openshift.io/description': 'test-description',
      },
    },
  },
});
describe('DeploymentsTableRowExpandedSection', () => {
  beforeEach(() => {
    mockExtensions();
    mockUseAssignHardwareProfile.mockReturnValue(
      mockUseAssignHardwareProfileResult({
        selectedHardwareProfile: mockHardwareProfile({ displayName: 'test-profile' }),
      }),
    );
    mockUseWizardFieldExtractors.mockReturnValue({
      extractedFieldData: { 'maas/save-as-maas-checkbox': { isChecked: true } },
      extractorsLoaded: true,
      extractorErrors: [],
    });
    mockExtractModelAvailabilityData.mockReturnValue({
      saveAsAiAsset: true,
      useCase: 'test-use-case',
    });
  });

  afterEach(() => {
    mockUseAssignHardwareProfile.mockReset();
    mockUseWizardFieldExtractors.mockReset();
    mockExtractModelAvailabilityData.mockReset();
  });
  it('should render the MaaS and Gen AI Studio availability for subscribed users', () => {
    render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfilePaths={{
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        }}
      />,
    );
    // description
    expect(screen.getByText('test-description')).toBeInTheDocument();
    // model format
    expect(screen.getByText('test-model-format')).toBeInTheDocument();
    // replicas
    expect(screen.getByText('1')).toBeInTheDocument();
    // hardware profile
    expect(screen.getByText('test-profile')).toBeInTheDocument();
    // users and availability
    expect(screen.getByText('Subscribed users')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('model-availability-description-item'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Model-as-a-Service (MaaS)', 'Gen AI Studio']);
    // use case
    expect(screen.getByText('test-use-case')).toBeInTheDocument();
  });

  it('should show Gen AI Studio for MaaS deployments without the Gen AI annotation', () => {
    mockExtractModelAvailabilityData.mockReturnValue({ saveAsAiAsset: false });

    render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfilePaths={{
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        }}
      />,
    );

    const availability = screen.getByTestId('model-availability-description-item');
    expect(availability).toHaveTextContent('Model-as-a-Service (MaaS)');
    expect(availability).toHaveTextContent('Gen AI Studio');
    expect(screen.queryByTestId('use-case-description-item')).not.toBeInTheDocument();
  });

  describe('DRA claim template', () => {
    const draProfile = () =>
      mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-mig-partition' },
      });

    beforeEach(() => {
      mockUseIsDRAHardwareProfileEnabled.mockReturnValue(true);
    });

    afterEach(() => {
      mockUseIsDRAHardwareProfileEnabled.mockReturnValue(false);
    });

    const draDeployment = (resourceClaims?: PodSpec['resourceClaims']) => ({
      modelServingPlatformId: 'kserve',
      model: mockInferenceServiceK8sResource({
        hardwareProfileName: 'dra-profile',
        hardwareProfileNamespace: 'opendatahub',
        resourceClaims,
      }),
    });

    it("should request the deployment's own resources and show them as its size", () => {
      const resources = {
        requests: { cpu: '2', memory: '8Gi' },
        limits: { cpu: '4', memory: '16Gi' },
      };
      mockUseAssignHardwareProfile.mockReturnValue(
        mockUseAssignHardwareProfileResult({ selectedHardwareProfile: draProfile(), resources }),
      );
      const deployment = draDeployment();
      render(
        <DeploymentRowExpandedSection
          deployment={deployment}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
          hardwareProfile={draProfile()}
        />,
      );

      expect(mockUseAssignHardwareProfile).toHaveBeenCalledWith(deployment.model, {
        visibleIn: MODEL_SERVING_VISIBILITY,
        paths: INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
      });
      expect(screen.getByText('2 CPUs, 8GiB Memory requested')).toBeInTheDocument();
      expect(screen.getByText('4 CPUs, 16GiB Memory limit')).toBeInTheDocument();
    });

    it('should show the claim template of the deployment DRA claim', () => {
      render(
        <DeploymentRowExpandedSection
          deployment={draDeployment([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }])}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
          hardwareProfile={draProfile()}
        />,
      );

      const draDetails = screen.getByTestId('hardware-profile-dra-details');
      expect(draDetails).toHaveTextContent('Claim template');
      expect(draDetails).toHaveTextContent('Tech Preview');
      expect(screen.getByTestId('hardware-profile-dra-template')).toHaveTextContent('single-gpu');
    });

    it('should fall back to the claim template of the hardware profile', () => {
      render(
        <DeploymentRowExpandedSection
          deployment={draDeployment()}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
          hardwareProfile={draProfile()}
        />,
      );

      expect(screen.getByTestId('hardware-profile-dra-template')).toHaveTextContent(
        'single-mig-partition',
      );
    });

    it('should not show the claim template of a bound DRA hardware profile when DRA hardware profiles are disabled', () => {
      mockUseIsDRAHardwareProfileEnabled.mockReturnValue(false);
      render(
        <DeploymentRowExpandedSection
          deployment={draDeployment([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }])}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
          hardwareProfile={draProfile()}
        />,
      );

      expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
      expect(screen.queryByText(/Claim template/)).not.toBeInTheDocument();
      expect(screen.queryByText('Tech Preview')).not.toBeInTheDocument();
      expect(screen.getByTestId('hardware-section')).toBeInTheDocument();
    });

    it('should not show the claim template for a non-DRA hardware profile', () => {
      render(
        <DeploymentRowExpandedSection
          deployment={draDeployment()}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
          hardwareProfile={mockHardwareProfile({ name: 'small-profile' })}
        />,
      );

      expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    });

    it('should not show the claim template without a bound hardware profile', () => {
      render(
        <DeploymentRowExpandedSection
          deployment={draDeployment([{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }])}
          isVisible
          hardwareProfilePaths={INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS}
        />,
      );

      expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    });
  });
});
