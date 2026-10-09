import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

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
});
