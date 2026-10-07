import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import type { DraLookups } from '@odh-dashboard/hardware-profiles/shared/dra/types';
import { useResourceClaimLookups } from '@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockExtensions } from '../../../__tests__/mockUtils';
import type { DeploymentPods } from '../../../../extension-points';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

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
        extractModelAvailabilityData: () => ({
          saveAsAiAsset: true,
          useCase: 'test-use-case',
        }),
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

jest.mock('@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups', () => ({
  useResourceClaimLookups: jest.fn(),
}));
const mockUseResourceClaimLookups = jest.mocked(useResourceClaimLookups);

const NAMESPACE = 'test-project';
const TEMPLATE = 'single-gpu';
const CONTAINER = 'kserve-container';
const REQUESTED_CLASS = 'gpu.nvidia.com';
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }];
const RESULT = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-01', device: 'gpu-0' };
const EMPTY: DraLookups = { claims: {}, templates: {} };
const HARDWARE_PROFILE_PATHS = {
  containerResourcesPath: 'spec.predictor.model.resources',
  tolerationsPath: 'spec.predictor.tolerations',
  nodeSelectorPath: 'spec.predictor.nodeSelector',
};

const claimNameFor = (pod: string) => `${pod}-gpu-abc12`;

const draPod = (
  name: string,
  overrides: Partial<Parameters<typeof mockPodK8sResource>[0]> = {},
): PodKind =>
  mockPodK8sResource({
    name,
    namespace: NAMESPACE,
    uid: name,
    containerName: CONTAINER,
    nodeName: `node-${name}`,
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: claimNameFor(name) }],
    containerClaims: [{ name: 'gpu' }],
    ...overrides,
  });

const allocated = (name: string): DraLookups['claims'][string] => ({
  status: 'loaded',
  resource: mockResourceClaim({ name, requests: REQUESTS, allocationResults: [RESULT] }),
});

const mockDeployment = (pods?: Partial<DeploymentPods>) => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: NAMESPACE,
      annotations: {
        'openshift.io/description': 'test-description',
      },
    },
  },
  ...(pods ? { pods: { data: [], loaded: true, containerNames: [CONTAINER], ...pods } } : {}),
});

const renderSection = (pods?: Partial<DeploymentPods>, isVisible = true) =>
  render(
    <DeploymentRowExpandedSection
      deployment={mockDeployment(pods)}
      isVisible={isVisible}
      hardwareProfilePaths={HARDWARE_PROFILE_PATHS}
    />,
  );

const expectExistingDetails = () => {
  // description
  expect(screen.getByText('test-description')).toBeInTheDocument();
  // model format
  expect(screen.getByText('test-model-format')).toBeInTheDocument();
  // replicas
  expect(screen.getByText('1')).toBeInTheDocument();
  // hardware profile
  expect(screen.getByText('test-profile')).toBeInTheDocument();
  // model availability
  expect(screen.getByText('AI asset endpoint, Model-as-a-Service (MaaS)')).toBeInTheDocument();
  // use case
  expect(screen.getByText('test-use-case')).toBeInTheDocument();
};

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
    mockUseResourceClaimLookups.mockReturnValue(EMPTY);
  });

  afterEach(() => {
    mockUseAssignHardwareProfile.mockReset();
    mockUseWizardFieldExtractors.mockReset();
    mockUseResourceClaimLookups.mockReset();
  });

  it('should render the expanded row with correct data', () => {
    renderSection();

    expectExistingDetails();
    expect(screen.queryByTestId('deployment-claims-section')).not.toBeInTheDocument();
  });

  it('should leave a non-DRA deployment unchanged and request no claims', () => {
    renderSection({ data: [mockPodK8sResource({ name: 'plain', namespace: NAMESPACE })] });

    expectExistingDetails();
    expect(screen.queryByTestId('deployment-claims-section')).not.toBeInTheDocument();
    expect(mockUseResourceClaimLookups).toHaveBeenCalledWith(
      expect.objectContaining({ claimNames: [], templateNames: [], enabled: false }),
    );
  });

  it('should show no Claims row and arm no lookups for a loaded, empty Pod list', () => {
    renderSection({ data: [], loaded: true });

    expectExistingDetails();
    expect(screen.queryByTestId('deployment-claims-section')).not.toBeInTheDocument();
    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith({
      namespace: NAMESPACE,
      claimNames: [],
      templateNames: [],
      enabled: false,
      refreshRate: 0,
    });
  });

  it('should treat a multi-node worker container as the model server', () => {
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [claimNameFor('worker-0')]: allocated(claimNameFor('worker-0')) },
      templates: {},
    });
    renderSection({
      data: [draPod('worker-0', { containerName: 'worker-container' })],
      containerNames: ['kserve-container', 'worker-container', 'transformer-container'],
    });

    expect(screen.getByTestId('claims-group-worker-0-status')).toHaveTextContent('Allocated');
    expect(
      screen.queryByTestId('claims-group-worker-0-item-gpu-consumers'),
    ).not.toBeInTheDocument();
  });

  it('should render nothing while collapsed', () => {
    renderSection({ data: [draPod('predictor-0')] }, false);

    expect(screen.queryByTestId('deployment-claims-section')).not.toBeInTheDocument();
    expect(mockUseResourceClaimLookups).not.toHaveBeenCalled();
  });

  it('should show one allocated Pod group beside the existing details', async () => {
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [claimNameFor('predictor-0')]: allocated(claimNameFor('predictor-0')) },
      templates: {},
    });
    renderSection({ data: [draPod('predictor-0')] });

    expectExistingDetails();
    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith({
      namespace: NAMESPACE,
      claimNames: [claimNameFor('predictor-0')],
      templateNames: [],
      enabled: true,
      refreshRate: 30000,
    });
    const section = screen.getByTestId('deployment-claims-section');
    expect(within(section).getByText('Claims')).toBeInTheDocument();
    expect(screen.queryByTestId('claims-section-title')).not.toBeInTheDocument();
    expect(screen.getByTestId('claims-group-predictor-0-pod')).toHaveTextContent('predictor-0');
    expect(screen.getByTestId('claims-group-predictor-0-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claims-group-predictor-0-summary')).toHaveTextContent(
      `gpu: ${TEMPLATE} · 1 allocated device`,
    );
    expect(screen.getByTestId('claims-group-predictor-0-item-gpu')).not.toBeVisible();

    await userEvent.click(
      within(screen.getByTestId('claims-group-predictor-0-toggle')).getByRole('button'),
    );
    expect(screen.getByTestId('claims-group-predictor-0-item-gpu')).toBeVisible();
    await userEvent.click(screen.getByTestId('claims-group-predictor-0-item-gpu-details-toggle'));
    expect(
      screen.getByTestId('claims-group-predictor-0-item-gpu-device-0-class'),
    ).toHaveTextContent(REQUESTED_CLASS);
    expect(
      screen.getByTestId('claims-group-predictor-0-item-gpu-device-0-device'),
    ).toHaveTextContent(RESULT.device);
    expect(screen.getByTestId('claims-group-predictor-0-item-gpu-node')).toHaveTextContent(
      'node-predictor-0',
    );
    expect(screen.getByTestId('claims-group-predictor-0-item-gpu-claim')).toHaveTextContent(
      claimNameFor('predictor-0'),
    );
  });

  it('should keep an allocated replica intact beside a pending one', async () => {
    const pending = draPod('predictor-1', {
      isPending: true,
      nodeName: null,
      resourceClaimStatuses: undefined,
    });
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [claimNameFor('predictor-0')]: allocated(claimNameFor('predictor-0')) },
      templates: {
        [TEMPLATE]: {
          status: 'loaded',
          resource: {
            apiVersion: 'resource.k8s.io/v1',
            kind: 'ResourceClaimTemplate',
            metadata: { name: TEMPLATE, namespace: NAMESPACE },
            spec: { spec: { devices: { requests: REQUESTS } } },
          },
        },
      },
    });
    renderSection({ data: [pending, draPod('predictor-0')] });

    expect(mockUseResourceClaimLookups).toHaveBeenLastCalledWith(
      expect.objectContaining({
        claimNames: [claimNameFor('predictor-0')],
        templateNames: [TEMPLATE],
      }),
    );
    expect(screen.getByTestId('claims-group-predictor-0-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claims-group-predictor-1-status')).toHaveTextContent('Pending');
    expect(screen.getByTestId('claims-group-predictor-1-summary')).toHaveTextContent(
      `gpu: ${TEMPLATE} · Pending allocation`,
    );

    await userEvent.click(
      within(screen.getByTestId('claims-group-predictor-1-toggle')).getByRole('button'),
    );
    expect(
      screen.getByTestId('claims-group-predictor-1-item-gpu-request-0-device-class'),
    ).toHaveTextContent(REQUESTED_CLASS);
    expect(screen.queryByTestId('claims-group-predictor-1-item-gpu-claim')).not.toBeInTheDocument();
    expect(screen.getByTestId('claims-group-predictor-0-item-gpu')).not.toBeVisible();
  });

  it('should mark only the replica whose claim lookup failed', () => {
    mockUseResourceClaimLookups.mockReturnValue({
      claims: {
        [claimNameFor('predictor-0')]: allocated(claimNameFor('predictor-0')),
        [claimNameFor('predictor-1')]: { status: 'forbidden' },
      },
      templates: {},
    });
    renderSection({ data: [draPod('predictor-0'), draPod('predictor-1')] });

    expect(screen.getByTestId('claims-group-predictor-0-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claims-group-predictor-1-status')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('claims-group-predictor-1-summary')).toHaveTextContent(
      `gpu: ${TEMPLATE} · Access denied`,
    );
    expect(screen.getByTestId('claims-group-predictor-1-item-gpu-claim')).toHaveTextContent(
      claimNameFor('predictor-1'),
    );
  });

  it('should keep the groups under a warning when the Pod watch later fails', () => {
    mockUseResourceClaimLookups.mockReturnValue({
      claims: { [claimNameFor('predictor-0')]: allocated(claimNameFor('predictor-0')) },
      templates: {},
    });
    renderSection({ data: [draPod('predictor-0')], loaded: true, error: new Error('watch lost') });

    expect(screen.getByTestId('claims-section-refresh-error')).toHaveTextContent('watch lost');
    expect(screen.getByTestId('claims-group-predictor-0-status')).toHaveTextContent('Allocated');
  });
});
