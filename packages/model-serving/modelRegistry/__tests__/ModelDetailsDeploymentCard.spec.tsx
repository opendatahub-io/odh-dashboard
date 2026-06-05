import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { Deployment } from '../../extension-points';
import { mockExtensions } from '../../src/__tests__/mockUtils';
import ModelDetailsDeploymentCard from '../ModelDetailsDeploymentCard';
import { ModelDeploymentsContext } from '../../src/concepts/ModelDeploymentsContext';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectsContext', () => {
  const { createContext } = require('react');
  return { ProjectsContext: createContext({ projects: [] }) };
});

const mockUseDeploymentExtension = jest.fn().mockReturnValue(null);
jest.mock('../../src/concepts/extensionUtils', () => ({
  useDeploymentExtension: (...args: unknown[]) => mockUseDeploymentExtension(...args),
}));

jest.mock('../useModelRegistryFilter', () => ({
  useModelRegistryFilter: () => undefined,
}));

jest.mock('../../src/concepts/ModelDeploymentsContext', () => {
  const actual = jest.requireActual('../../src/concepts/ModelDeploymentsContext');
  return {
    ...actual,
    ModelDeploymentsProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockDeployment = (partial: Partial<Deployment> = {}): Deployment => ({
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

const renderWithContext = (deployments: Deployment[], component: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ModelDeploymentsContext.Provider value={{ deployments, loaded: true }}>
        {component}
      </ModelDeploymentsContext.Provider>
    </MemoryRouter>,
  );

describe('ModelDetailsDeploymentCard', () => {
  beforeEach(() => {
    mockExtensions();
    mockUseDeploymentExtension.mockReturnValue(null);
  });

  describe('Metrics link', () => {
    it('should not render metrics link when deployment state is FAILED_TO_LOAD', () => {
      mockUseDeploymentExtension.mockReturnValue({ properties: { platform: 'test-platform' } });

      const deployment = mockDeployment({
        status: {
          state: ModelDeploymentState.FAILED_TO_LOAD,
          stoppedStates: {
            isRunning: true,
            isStopped: false,
            isStarting: false,
            isStopping: false,
          },
        },
      });

      renderWithContext([deployment], <ModelDetailsDeploymentCard rmId="1" mrName="test-mr" />);

      expect(screen.getByTestId('deployed-model-name')).toBeInTheDocument();
      expect(screen.queryByTestId('metrics-link-test-deployment')).not.toBeInTheDocument();
    });

    it('should render metrics link when deployment state is LOADED and running', () => {
      mockUseDeploymentExtension.mockReturnValue({ properties: { platform: 'test-platform' } });

      const deployment = mockDeployment({
        status: {
          state: ModelDeploymentState.LOADED,
          stoppedStates: {
            isRunning: true,
            isStopped: false,
            isStarting: false,
            isStopping: false,
          },
        },
      });

      renderWithContext([deployment], <ModelDetailsDeploymentCard rmId="1" mrName="test-mr" />);

      expect(screen.getByTestId('metrics-link-test-deployment')).toBeInTheDocument();
    });

    it('should render metrics link when deployment state is LOADED and stopped', () => {
      mockUseDeploymentExtension.mockReturnValue({ properties: { platform: 'test-platform' } });

      const deployment = mockDeployment({
        status: {
          state: ModelDeploymentState.LOADED,
          stoppedStates: {
            isRunning: false,
            isStopped: true,
            isStarting: false,
            isStopping: false,
          },
        },
      });

      renderWithContext([deployment], <ModelDetailsDeploymentCard rmId="1" mrName="test-mr" />);

      expect(screen.getByTestId('metrics-link-test-deployment')).toBeInTheDocument();
    });
  });
});
