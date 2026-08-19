import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { type LLMInferenceServiceConfigKind, TopologyType } from '../../../types';
import { TopologyConfigContext } from '../TopologyConfigContext';
import TopologyConfigurationCreateEdit from '../TopologyConfigurationCreateEdit';
import { TOPOLOGY_CONFIGS_TAB_PATH } from '../paths';

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
    <MemoryRouter
      initialEntries={[`${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/${config.metadata.name}`]}
    >
      <TopologyConfigContext.Provider value={{ configs: [config] }}>
        <Routes>
          <Route
            path={`${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`}
            element={<TopologyConfigurationCreateEdit isDuplicate />}
          />
        </Routes>
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

// Renders the add route with an arbitrary :topologyType, plus a sentinel list
// route so a redirect away from the form lands somewhere assertable.
const renderAtAdd = (topologyType: string) =>
  render(
    <MemoryRouter initialEntries={[`${TOPOLOGY_CONFIGS_TAB_PATH}/add/${topologyType}`]}>
      <TopologyConfigContext.Provider value={{ configs: [] }}>
        <Routes>
          <Route
            path={`${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`}
            element={<TopologyConfigurationCreateEdit />}
          />
          <Route path={TOPOLOGY_CONFIGS_TAB_PATH} element={<div data-testid="list-landing" />} />
        </Routes>
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

// Renders the edit route for a configName with the given configs available in
// context, plus a sentinel list route.
const renderAtEdit = (configName: string, configs: LLMInferenceServiceConfigKind[]) =>
  render(
    <MemoryRouter initialEntries={[`${TOPOLOGY_CONFIGS_TAB_PATH}/edit/${configName}`]}>
      <TopologyConfigContext.Provider value={{ configs }}>
        <Routes>
          <Route
            path={`${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`}
            element={<TopologyConfigurationCreateEdit />}
          />
          <Route path={TOPOLOGY_CONFIGS_TAB_PATH} element={<div data-testid="list-landing" />} />
        </Routes>
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

// Renders the duplicate route for a configName with the given configs available
// in context, plus a sentinel list route.
const renderAtDuplicateByName = (configName: string, configs: LLMInferenceServiceConfigKind[]) =>
  render(
    <MemoryRouter initialEntries={[`${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/${configName}`]}>
      <TopologyConfigContext.Provider value={{ configs }}>
        <Routes>
          <Route
            path={`${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`}
            element={<TopologyConfigurationCreateEdit isDuplicate />}
          />
          <Route path={TOPOLOGY_CONFIGS_TAB_PATH} element={<div data-testid="list-landing" />} />
        </Routes>
      </TopologyConfigContext.Provider>
    </MemoryRouter>,
  );

describe('TopologyConfigurationCreateEdit', () => {
  let originalFetch: typeof global.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // The add form probes for a sample template on mount; stub global fetch so
    // that post-render effect doesn't throw in jsdom (its result isn't asserted
    // here — these tests cover render-vs-redirect, not template loading).
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

  describe('add mode topology-type validation', () => {
    it('should render the form for a supported topology type', () => {
      renderAtAdd(TopologyType.SINGLE_NODE);

      expect(screen.getByTestId('app-page')).toBeInTheDocument();
      expect(screen.queryByTestId('list-landing')).not.toBeInTheDocument();
    });

    it('should redirect to the list for an unsupported topology type', () => {
      renderAtAdd('not-a-topology');

      expect(screen.getByTestId('list-landing')).toBeInTheDocument();
      expect(screen.queryByTestId('app-page')).not.toBeInTheDocument();
    });
  });

  describe('missing config', () => {
    it('should show a not-found message rather than redirect when editing a config that does not exist', () => {
      renderAtEdit('does-not-exist', []);

      expect(screen.getByText('Unable to edit topology configuration')).toBeInTheDocument();
      expect(screen.getByText('does-not-exist', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Return to the list' })).toBeInTheDocument();
      // It must NOT silently redirect to the list.
      expect(screen.queryByTestId('list-landing')).not.toBeInTheDocument();
    });

    it('should label the not-found message as a duplicate failure when duplicating a config that does not exist', () => {
      renderAtDuplicateByName('does-not-exist', []);

      // Copy reflects the duplicate operation, not "edit".
      expect(screen.getByText('Unable to duplicate topology configuration')).toBeInTheDocument();
      expect(screen.queryByText('Unable to edit topology configuration')).not.toBeInTheDocument();
      expect(screen.getByText('does-not-exist', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Return to the list' })).toBeInTheDocument();
      expect(screen.queryByTestId('list-landing')).not.toBeInTheDocument();
    });
  });
});
