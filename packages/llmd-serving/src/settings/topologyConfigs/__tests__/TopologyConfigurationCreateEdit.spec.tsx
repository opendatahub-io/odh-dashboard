import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { type LLMInferenceServiceConfigKind, TopologyType } from '../../../types';
import { TopologyConfigContext } from '../TopologyConfigContext';
import TopologyConfigurationCreateEdit from '../TopologyConfigurationCreateEdit';

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

jest.mock('../../ConfigYAMLEditor', () =>
  jest.fn(({ code, onCodeChange }) => (
    <textarea
      data-testid="yaml-editor-mock"
      value={code}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onCodeChange(e.target.value)}
    />
  )),
);

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  patchLLMInferenceServiceConfig: jest.fn(),
}));

const renderAtDuplicate = (config: LLMInferenceServiceConfigKind) =>
  render(
    <MemoryRouter initialEntries={[`/list/duplicate/${config.metadata.name}`]}>
      <TopologyConfigContext.Provider value={{ configs: [config] }}>
        <Routes>
          <Route
            path="/list/duplicate/:configName"
            element={<TopologyConfigurationCreateEdit listPath="/list" isDuplicate />}
          />
        </Routes>
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

describe('TopologyConfigurationCreateEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('duplicate mode', () => {
    it('should auto-update resource name when display name changes', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-topology',
        displayName: 'Source Topology',
        topologyType: TopologyType.SINGLE_NODE,
      });

      renderAtDuplicate(sourceConfig);

      const nameInput = screen.getByTestId('topology-config-name');
      fireEvent.change(nameInput, { target: { value: 'My Custom Topology' } });

      expect(screen.getByText('my-custom-topology', { exact: false })).toBeInTheDocument();
    });
  });
});
