import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams, useLocation } from 'react-router';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import { useWatchTopologyConfigs } from '../../api/LLMInferenceServiceConfigs';
import TopologyConfigurationCreateEdit from '../TopologyConfigurationCreateEdit';

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
  useWatchTopologyConfigs: jest.fn(),
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);
const mockUseLocation = jest.mocked(useLocation);
const mockUseWatchTopologyConfigs = jest.mocked(useWatchTopologyConfigs);

describe('TopologyConfigurationCreateEdit', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseLocation.mockReturnValue({ state: null, key: '', pathname: '', search: '', hash: '' });
  });

  describe('duplicate mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({});
      mockUseWatchTopologyConfigs.mockReturnValue([[], true, undefined]);
    });

    it('should auto-update resource name when display name changes', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-topology',
        displayName: 'Source Topology',
        topologyType: TopologyType.SINGLE_NODE,
      });

      mockUseLocation.mockReturnValue({
        state: { sourceConfig },
        key: '',
        pathname: '',
        search: '',
        hash: '',
      });

      render(<TopologyConfigurationCreateEdit />);

      const nameInput = screen.getByTestId('topology-config-name');
      fireEvent.change(nameInput, { target: { value: 'My Custom Topology' } });

      expect(screen.getByText('my-custom-topology', { exact: false })).toBeInTheDocument();
    });
  });
});
