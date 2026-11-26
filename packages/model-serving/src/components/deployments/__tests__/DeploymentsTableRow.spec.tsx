import * as React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import { useAssignHardwareProfile } from '@odh-dashboard/hardware-profiles/shared/useAssignHardwareProfile';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { Deployment, isModelServingStartStopAction } from '../../../../extension-points';
import { mockExtensions } from '../../../__tests__/mockUtils';
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
const mockUseDeploymentExtension = jest.fn().mockReturnValue(null);
jest.mock('../../../concepts/extensionUtils', () => ({
  useDeploymentExtension: (...args: unknown[]) => mockUseDeploymentExtension(...args),
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
jest.mock('@odh-dashboard/hardware-profiles/shared/useAssignHardwareProfile', () => ({
  useAssignHardwareProfile: jest.fn(),
}));

// Mock the DeploymentHardwareProfileCell component
jest.mock('../row/DeploymentHardwareProfileCell', () => ({
  DeploymentHardwareProfileCell: () => <td>Hardware Profile</td>,
}));

// Mock useHardwareProfileBindingState (invoked directly in DeploymentsTableRow)
jest.mock('@odh-dashboard/hardware-profiles/shared', () => {
  const actual = jest.requireActual('@odh-dashboard/hardware-profiles/shared');
  return {
    ...actual,
    useHardwareProfileBindingState: () => [null, true, undefined],
  };
});

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

const DeploymentAccessHost: React.FC<
  React.PropsWithChildren<{ checkAccess: HostApiCoreServices['checkAccess'] }>
> = ({ checkAccess, children }) => {
  const core = React.useContext(HostApiCoreContext);
  const value = React.useMemo(
    () => ({
      ...core,
      checkAccess,
      deploymentApi: {
        group: 'serving.kserve.io',
        resource: 'llminferenceservices',
        resources: { llminferenceservices: ['update', 'delete', 'patch'] },
      },
    }),
    [core, checkAccess],
  );
  return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
};

describe('DeploymentsTableRow', () => {
  let onDelete: jest.Mock;

  beforeEach(() => {
    onDelete = jest.fn();
    mockExtensions();
    mockUseDeploymentExtension.mockReturnValue(null);
    (useAssignHardwareProfile as jest.Mock).mockReturnValue(mockUseAssignHardwareProfileResult());
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

  it('should review edit and delete when the menu opens and block denied actions', async () => {
    const checkAccess = jest.fn<Promise<boolean>, Parameters<HostApiCoreServices['checkAccess']>>(
      async () => false,
    );
    renderWithRouter(
      <DeploymentAccessHost checkAccess={checkAccess}>
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment()}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>
      </DeploymentAccessHost>,
    );

    expect(checkAccess).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Kebab toggle' })));
    await waitFor(() => expect(checkAccess).toHaveBeenCalledTimes(2));
    expect(
      checkAccess.mock.calls.map(([attrs]) => [attrs.verb, attrs.namespace, attrs.name]),
    ).toEqual([
      ['update', 'test-project', 'test-deployment'],
      ['delete', 'test-project', 'test-deployment'],
    ]);
    const edit = screen.getByRole('menuitem', { name: 'Edit' });
    const remove = screen.getByRole('menuitem', { name: 'Delete' });
    expect(edit).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(remove);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should stop a deployment without stopped states after confirming from the status dialog', async () => {
    const deployment = mockDeployment({ status: { state: ModelDeploymentState.LOADED } });
    const patchDeployment = jest.fn().mockResolvedValue(deployment.model);
    mockUseDeploymentExtension.mockImplementation((predicate) =>
      predicate === isModelServingStartStopAction
        ? { properties: { patchDeploymentStoppedStatus: async () => patchDeployment } }
        : null,
    );
    const checkAccess: HostApiCoreServices['checkAccess'] = async ({ verb }) => verb === 'patch';

    renderWithRouter(
      <DeploymentAccessHost checkAccess={checkAccess}>
        <table>
          <tbody>
            <DeploymentRow
              deployment={deployment}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>
      </DeploymentAccessHost>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    fireEvent.click(await screen.findByTestId('deployment-status-stop-button'));
    expect(screen.queryByTestId('deployment-status-modal')).not.toBeInTheDocument();
    expect(patchDeployment).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByTestId('stop-model-button')));
    expect(patchDeployment).toHaveBeenCalledTimes(1);
    expect(patchDeployment).toHaveBeenCalledWith(deployment, true);
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

  describe('Metrics link', () => {
    it('should not render metrics link when deployment state is FAILED_TO_LOAD', () => {
      mockUseDeploymentExtension.mockReturnValue({ properties: { platform: 'test-platform' } });

      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                status: {
                  state: ModelDeploymentState.FAILED_TO_LOAD,
                  stoppedStates: {
                    isRunning: true,
                    isStopped: false,
                    isStarting: false,
                    isStopping: false,
                  },
                },
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      expect(screen.getByTestId('deployed-model-name')).toBeInTheDocument();
      expect(screen.queryByTestId('metrics-link-test-deployment')).not.toBeInTheDocument();
    });

    it('should render metrics link when deployment state is LOADED and running', () => {
      mockUseDeploymentExtension.mockReturnValue({ properties: { platform: 'test-platform' } });

      renderWithRouter(
        <table>
          <tbody>
            <DeploymentRow
              deployment={mockDeployment({
                status: {
                  state: ModelDeploymentState.LOADED,
                  stoppedStates: {
                    isRunning: true,
                    isStopped: false,
                    isStarting: false,
                    isStopping: false,
                  },
                },
              })}
              platformColumns={[]}
              onDelete={onDelete}
              rowIndex={0}
            />
          </tbody>
        </table>,
      );

      expect(screen.getByTestId('metrics-link-test-deployment')).toBeInTheDocument();
      expect(screen.getByTestId('deployed-model-name')).toBeInTheDocument();
    });
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
});
