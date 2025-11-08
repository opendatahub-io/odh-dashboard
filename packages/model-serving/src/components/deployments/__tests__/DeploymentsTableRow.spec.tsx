import * as React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { Deployment } from '../../../../extension-points';
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
jest.mock('../../../concepts/extensionUtils', () => ({
  useDeploymentExtension: () => null,
  useResolvedDeploymentExtension: () => [null, true, []],
}));

// Mock the useExtractFormDataFromDeployment hook
jest.mock('../../deploymentWizard/useExtractFormDataFromDeployment', () => ({
  useExtractFormDataFromDeployment: () => ({
    formData: undefined,
    loaded: true,
    error: undefined,
  }),
}));

// Mock the DeploymentHardwareProfileCell component
jest.mock(
  '@odh-dashboard/internal/concepts/hardwareProfiles/DeploymentHardwareProfileCell',
  () => ({
    DeploymentHardwareProfileCell: () => <td>Hardware Profile</td>,
  }),
);

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
    onDelete = jest.fn();
    mockExtensions();
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

    expect(screen.getByText('Started')).toBeInTheDocument();
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
