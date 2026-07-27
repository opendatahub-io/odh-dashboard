import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams, useLocation } from 'react-router';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import { useWatchRouterConfigs } from '../../api/LLMInferenceServiceConfigs';
import RoutingConfigurationCreateEdit from '../RoutingConfigurationCreateEdit';

jest.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useNavigate: jest.fn(),
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="app-page" data-title={title}>
      {children}
    </div>
  ),
}));

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: () => ({ error: jest.fn(), success: jest.fn() }),
}));

jest.mock('../ConfigYAMLEditor', () =>
  jest.fn(({ code, onCodeChange }) => (
    <textarea
      data-testid="yaml-editor-mock"
      value={code}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onCodeChange(e.target.value)}
    />
  )),
);

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  patchLLMInferenceServiceConfig: jest.fn(),
  useWatchRouterConfigs: jest.fn(),
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);
const mockUseLocation = jest.mocked(useLocation);
const mockUseWatchRouterConfigs = jest.mocked(useWatchRouterConfigs);

describe('RoutingConfigurationCreateEdit', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseLocation.mockReturnValue({ state: null, key: '', pathname: '', search: '', hash: '' });
  });

  describe('create mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({});
      mockUseWatchRouterConfigs.mockReturnValue([[], true, undefined]);
    });

    it('should not disable the topology type select', () => {
      render(<RoutingConfigurationCreateEdit />);

      const topologySelect = screen.getByTestId('topology-type-select');
      expect(topologySelect).not.toBeDisabled();
    });
  });

  describe('edit mode', () => {
    const existingConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-router',
      displayName: 'Test Router',
      configType: 'router' as never,
      supportedTopologies: [TopologyType.SINGLE_NODE],
    });

    beforeEach(() => {
      mockUseParams.mockReturnValue({ configName: 'test-router' });
      mockUseWatchRouterConfigs.mockReturnValue([[existingConfig], true, undefined]);
    });

    it('should not disable the topology type select', () => {
      render(<RoutingConfigurationCreateEdit />);

      const topologySelect = screen.getByTestId('topology-type-select');
      expect(topologySelect).not.toBeDisabled();
    });
  });
});
