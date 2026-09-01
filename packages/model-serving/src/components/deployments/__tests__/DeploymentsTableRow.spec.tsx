import * as React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/internal/__mocks__/mockUseAssignHardwareProfileResult';
import { useAssignHardwareProfile } from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import { useHardwareProfileBindingState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState';
import {
  HardwareProfileBindingState,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import { mockHardwareProfile } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  Deployment,
  isModelServingStartStopAction,
  type ModelServingStartStopAction,
} from '../../../../extension-points';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { useDeploymentExtension } from '../../../concepts/extensionUtils';
import { DeploymentRow } from '../row/DeploymentsTableRow';

jest.mock('@odh-dashboard/plugin-core');

// Mock the useModelDeploymentNotification hook
jest.mock('../../../concepts/useModelDeploymentNotification', () => ({
  useModelDeploymentNotification: () => ({
    watchDeployment: jest.fn(),
  }),
}));

// Mock the useStopModalPreference hook
jest.mock('../../../concepts/useStopModalPreference', () => ({
  __esModule: true,
  default: () => [false, jest.fn()],
}));

// Mock the useDeploymentExtension hook
jest.mock('../../../concepts/extensionUtils', () => ({
  useDeploymentExtension: jest.fn(),
  useResolvedDeploymentExtension: () => [
    {
      properties: {
        hardwareProfilePaths: {
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        },
      },
    },
    true,
    [],
  ],
}));

// Mock the useExtractFormDataFromDeployment hook
jest.mock('../../deploymentWizard/useExtractFormDataFromDeployment', () => ({
  useExtractFormDataFromDeployment: () => ({
    formData: undefined,
    loaded: true,
    error: undefined,
  }),
}));

// Mock the useAssignHardwareProfile hook
jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile', () => ({
  useAssignHardwareProfile: jest.fn(),
}));

// Mock the DeploymentHardwareProfileCell component
jest.mock('../row/DeploymentHardwareProfileCell', () => ({
  DeploymentHardwareProfileCell: () => <td>Hardware Profile</td>,
}));

jest.mock(
  '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState',
  () => ({
    useHardwareProfileBindingState: jest.fn(),
  }),
);

const mockUseDeploymentExtension = jest.mocked(useDeploymentExtension);
const mockUseHardwareProfileBindingState = jest.mocked(useHardwareProfileBindingState);

const mockDeployment = (partial: Partial<Deployment> = {}) => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-project',
    },
  },
  server: partial.server,
  status: partial.status,
  endpoints: partial.endpoints,
  apiProtocol: partial.apiProtocol,
});

// Helper function to wrap components with Router for testing
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('DeploymentsTableRow', () => {
  let onDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onDelete = jest.fn();
    mockExtensions();
    (useAssignHardwareProfile as jest.Mock).mockReturnValue(mockUseAssignHardwareProfileResult());
    mockUseDeploymentExtension.mockReturnValue(null);
    mockUseHardwareProfileBindingState.mockReturnValue([null, true, undefined]);
  });

  it('should render the basic row', async () => {
    renderWithRouter(
      <table>
        <tbody>
          <DeploymentRow
            deployment={mockDeployment({})}
            platformColumns={[]}
            onDelete={onDelete}
            rowIndex={0}
          />
        </tbody>
      </table>,
    );

    // Name Column
    expect(screen.getByRole('cell', { name: 'test-deployment' })).toBeInTheDocument();
    // Name Column - More info button
    expect(screen.getByRole('button', { name: 'More info' })).toBeInTheDocument();
    // Inference endpoint Column
    expect(screen.getByText('Failed to get endpoint for this deployed model.')).toBeInTheDocument();
    // Status Column
    expect(screen.getByText('Inference Service Status')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kebab toggle' }));
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('should render with platform columns', () => {
    renderWithRouter(
      <table>
        <tbody>
          <DeploymentRow
            deployment={mockDeployment({})}
            platformColumns={[
              {
                label: 'Platform',
                field: 'platform',
                sortable: false,
                cellRenderer: () => 'test-data',
              },
            ]}
            onDelete={onDelete}
            rowIndex={0}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('test-data')).toBeInTheDocument();
  });

  it('should render the row with a status', () => {
    renderWithRouter(
      <table>
        <tbody>
          <DeploymentRow
            deployment={mockDeployment({
              status: { state: ModelDeploymentState.LOADED },
            })}
            platformColumns={[]}
            onDelete={onDelete}
            rowIndex={0}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  describe('Inference endpoints', () => {
    it('should render the row with internal inference endpoint', async () => {
      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                endpoints: [
                  {
                    type: 'internal',
                    name: 'test-endpoint',
                    url: 'https://internal-endpoint.com',
                  },
                ],
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      const button = screen.getByRole('button', { name: 'Internal endpoint' });
      expect(button).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText('https://internal-endpoint.com')).toBeInTheDocument();
    });

    it('should render the row with external inference endpoint', async () => {
      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                endpoints: [
                  {
                    type: 'external',
                    name: 'test-endpoint',
                    url: 'https://external-endpoint.com',
                  },
                ],
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      const button = screen.getByRole('button', { name: 'Internal and external endpoint' });
      expect(button).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText('https://external-endpoint.com')).toBeInTheDocument();
    });

    it('should render the row with multiple inference endpoints', async () => {
      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                endpoints: [
                  {
                    type: 'internal',
                    name: 'test-endpoint',
                    url: 'https://internal-endpoint.com',
                  },
                  {
                    type: 'external',
                    name: 'test-endpoint',
                    url: 'https://external-endpoint.com',
                  },
                ],
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      const button = screen.getByRole('button', { name: 'Internal and external endpoint' });
      expect(button).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText('https://internal-endpoint.com')).toBeInTheDocument();
      expect(screen.getByText('https://external-endpoint.com')).toBeInTheDocument();
    });

    it('should render the row with API protocol', async () => {
      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                apiProtocol: 'REST',
                endpoints: [
                  {
                    type: 'internal',
                    name: 'test-endpoint',
                    url: 'https://internal-endpoint.com',
                  },
                ],
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      const button = screen.getByRole('button', { name: 'Internal endpoint' });
      expect(button).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText('https://internal-endpoint.com')).toBeInTheDocument();
      expect(screen.getByTestId('api-protocol-label')).toBeInTheDocument();
      expect(screen.getByTestId('api-protocol-label')).toHaveTextContent('REST');
    });
  });

  describe('hardware profile patches', () => {
    const patchStoppedStatus = jest.fn();
    const patchDeploymentStoppedStatus = jest.fn();

    const startStopExtension: LoadedExtension<ModelServingStartStopAction> = {
      type: 'model-serving.deployments-table/start-stop-action',
      properties: { platform: 'test-platform', patchDeploymentStoppedStatus },
      pluginName: 'test-plugin',
      uid: 'start-stop',
    };
    const formDataExtension: LoadedExtension<Extension> = {
      type: 'model-serving.deployment/form-data',
      properties: {
        platform: 'test-platform',
        hardwareProfilePaths: INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
      },
      pluginName: 'test-plugin',
      uid: 'form-data',
    };

    beforeEach(() => {
      patchStoppedStatus.mockResolvedValue(undefined);
      patchDeploymentStoppedStatus.mockResolvedValue(patchStoppedStatus);
      mockUseDeploymentExtension.mockImplementation((guard) =>
        guard === isModelServingStartStopAction ? startStopExtension : null,
      );
      mockExtensions([formDataExtension]);
    });

    const renderRow = (
      stoppedStates: { isRunning: boolean; isStopped: boolean },
      model: InferenceServiceKind,
    ) =>
      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={{
                ...mockDeployment({
                  status: { state: ModelDeploymentState.LOADED, stoppedStates },
                }),
                model,
              }}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

    it('should send the annotation removals when stopping with a deleted profile', async () => {
      mockUseHardwareProfileBindingState.mockReturnValue([
        { state: HardwareProfileBindingState.DELETED, profile: undefined },
        true,
        undefined,
      ]);

      renderRow(
        { isRunning: true, isStopped: false },
        mockInferenceServiceK8sResource({ hardwareProfileName: 'deleted-profile' }),
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('state-action-toggle'));
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId('stop-model-button'));
      });

      expect(patchStoppedStatus).toHaveBeenCalledWith(
        expect.anything(),
        true,
        REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH,
      );
    });

    it('should strip the stale resource settings when starting with an updated profile', async () => {
      mockUseHardwareProfileBindingState.mockReturnValue([
        {
          state: HardwareProfileBindingState.UPDATED,
          profile: mockHardwareProfile({ resourceVersion: '999' }),
        },
        true,
        undefined,
      ]);

      renderRow(
        { isRunning: false, isStopped: true },
        mockInferenceServiceK8sResource({
          hardwareProfileName: 'small-profile',
          hardwareProfileResourceVersion: '1',
          resources: { requests: { cpu: '1', memory: '2Gi' }, limits: { cpu: '1', memory: '2Gi' } },
        }),
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('state-action-toggle'));
      });

      expect(patchStoppedStatus).toHaveBeenCalledWith(expect.anything(), false, [
        { op: 'remove', path: '/spec/predictor/model/resources' },
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1hardware-profile-resource-version',
          value: '999',
        },
      ]);
    });

    it('should disable the toggle while the binding state is still loading', () => {
      mockUseHardwareProfileBindingState.mockReturnValue([null, false, undefined]);

      renderRow({ isRunning: true, isStopped: false }, mockInferenceServiceK8sResource({}));

      expect(screen.getByTestId('state-action-toggle')).toBeDisabled();
    });

    it('should keep the toggle usable when the profiles cannot be loaded', () => {
      mockUseHardwareProfileBindingState.mockReturnValue([null, false, new Error('forbidden')]);

      renderRow({ isRunning: true, isStopped: false }, mockInferenceServiceK8sResource({}));

      expect(screen.getByTestId('state-action-toggle')).toBeEnabled();
    });
  });
});
