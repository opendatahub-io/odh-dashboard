import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../../types';
import type { LLMInferenceServiceConfigKind } from '../../../types';
import { RoutingConfigContext } from '../RoutingConfigContext';
import RoutingConfigurationCreateEdit from '../RoutingConfigurationCreateEdit';

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

const renderAtRoute = (
  configs: LLMInferenceServiceConfigKind[],
  registeredPath: string,
  url: string,
  props: { listPath: string; isDuplicate?: boolean },
) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <RoutingConfigContext.Provider value={{ configs }}>
        <Routes>
          <Route
            path={registeredPath}
            element={
              <RoutingConfigurationCreateEdit
                listPath={props.listPath}
                isDuplicate={props.isDuplicate}
              />
            }
          />
        </Routes>
      </RoutingConfigContext.Provider>
    </MemoryRouter>,
  );

describe('RoutingConfigurationCreateEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response)) as jest.Mock;
  });

  afterEach(() => {
    // @ts-expect-error — remove the stub so it can't leak into other suites
    delete global.fetch;
  });

  describe('create mode', () => {
    it('should not disable the topology type select', () => {
      renderAtRoute([], '/routing-configs/add', '/routing-configs/add', {
        listPath: '/routing-configs',
      });

      const topologySelect = screen.getByTestId('topology-type-select');
      expect(topologySelect).not.toBeDisabled();
    });
  });

  describe('duplicate mode', () => {
    it('should auto-update resource name when display name changes', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-router',
        displayName: 'Source Router',
        configType: 'router' as never,
        supportedTopologies: [TopologyType.SINGLE_NODE],
      });

      renderAtRoute(
        [sourceConfig],
        '/routing-configs/duplicate/:configName',
        '/routing-configs/duplicate/source-router',
        { listPath: '/routing-configs', isDuplicate: true },
      );

      const nameInput = screen.getByTestId('routing-config-name');
      fireEvent.change(nameInput, { target: { value: 'My Custom Router' } });

      expect(screen.getByText('my-custom-router', { exact: false })).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const existingConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-router',
      displayName: 'Test Router',
      configType: 'router' as never,
      supportedTopologies: [TopologyType.SINGLE_NODE],
    });

    it('should not disable the topology type select', () => {
      renderAtRoute(
        [existingConfig],
        '/routing-configs/edit/:configName',
        '/routing-configs/edit/test-router',
        { listPath: '/routing-configs' },
      );

      const topologySelect = screen.getByTestId('topology-type-select');
      expect(topologySelect).not.toBeDisabled();
    });
  });
});
