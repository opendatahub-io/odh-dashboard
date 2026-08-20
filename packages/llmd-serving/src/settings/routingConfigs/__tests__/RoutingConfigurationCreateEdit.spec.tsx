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
  props: { isDuplicate?: boolean } = {},
) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <RoutingConfigContext.Provider value={{ configs }}>
        <Routes>
          <Route
            path={registeredPath}
            element={<RoutingConfigurationCreateEdit isDuplicate={props.isDuplicate} />}
          />
        </Routes>
      </RoutingConfigContext.Provider>
    </MemoryRouter>,
  );

describe('RoutingConfigurationCreateEdit', () => {
  let originalFetch: typeof global.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response)) as jest.Mock;
  });

  afterEach(() => {
    // Restore the prior implementation rather than deleting, so a real fetch
    // (if one existed) isn't clobbered for later tests in the same worker.
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error — no prior fetch to restore; remove the stub
      delete global.fetch;
    }
  });

  describe('create mode', () => {
    it('should not disable the topology type select', () => {
      renderAtRoute([], '/routing-configs/add', '/routing-configs/add');

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
        { isDuplicate: true },
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
      );

      const topologySelect = screen.getByTestId('topology-type-select');
      expect(topologySelect).not.toBeDisabled();
    });
  });

  describe('missing config', () => {
    it('should show a not-found message rather than redirect when editing a config that does not exist', () => {
      renderAtRoute(
        [],
        '/routing-configs/edit/:configName',
        '/routing-configs/edit/does-not-exist',
      );

      expect(screen.getByText('Unable to edit routing configuration')).toBeInTheDocument();
      expect(screen.getByText('does-not-exist', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Return to the list' })).toBeInTheDocument();
      // It must NOT render the form's topology-type select (i.e. not the form).
      expect(screen.queryByTestId('topology-type-select')).not.toBeInTheDocument();
    });

    it('should label the not-found message as a duplicate failure when duplicating a config that does not exist', () => {
      renderAtRoute(
        [],
        '/routing-configs/duplicate/:configName',
        '/routing-configs/duplicate/does-not-exist',
        { isDuplicate: true },
      );

      // Copy reflects the duplicate operation, not "edit".
      expect(screen.getByText('Unable to duplicate routing configuration')).toBeInTheDocument();
      expect(screen.queryByText('Unable to edit routing configuration')).not.toBeInTheDocument();
      expect(screen.getByText('does-not-exist', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Return to the list' })).toBeInTheDocument();
      expect(screen.queryByTestId('topology-type-select')).not.toBeInTheDocument();
    });
  });
});
