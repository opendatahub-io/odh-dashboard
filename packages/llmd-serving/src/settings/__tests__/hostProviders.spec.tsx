import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestProviders } from '../../__tests__/hostApiTestUtils';
import {
  createLLMInferenceServiceConfig,
  deleteLlmInferenceServiceConfigIfUnreferenced,
  useWatchLLMInferenceServiceConfigs,
  useWatchRouterConfigs,
  useWatchTopologyConfigs,
} from '../../api/LLMInferenceServiceConfigs';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import LlmAcceleratorConfigContextProvider from '../llmAcceleratorConfigs/LlmAcceleratorConfigContext';
import LlmAcceleratorConfigFormBody from '../llmAcceleratorConfigs/LlmAcceleratorConfigFormBody';
import RoutingConfigContextProvider, {
  RoutingConfigContext,
} from '../routingConfigs/RoutingConfigContext';
import RoutingConfigurationCreateEdit from '../routingConfigs/RoutingConfigurationCreateEdit';
import TopologyConfigContextProvider, {
  TopologyConfigContext,
} from '../topologyConfigs/TopologyConfigContext';
import TopologyConfigurationCreateEdit from '../topologyConfigs/TopologyConfigurationCreateEdit';
import { useDeleteLlmInferenceServiceConfig } from '../useDeleteLlmInferenceServiceConfig';

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  deleteLlmInferenceServiceConfigIfUnreferenced: jest.fn(),
  useWatchLLMInferenceServiceConfigs: jest.fn(),
  useWatchRouterConfigs: jest.fn(),
  useWatchTopologyConfigs: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../ConfigYAMLEditor', () => ({
  __esModule: true,
  default: () => <div />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useWatchLLMInferenceServiceConfigs).mockReturnValue([[], true, undefined]);
  jest.mocked(useWatchRouterConfigs).mockReturnValue([[], true, undefined]);
  jest.mocked(useWatchTopologyConfigs).mockReturnValue([[], true, undefined]);
});

describe('settings host namespace', () => {
  it.each([
    ['accelerator', LlmAcceleratorConfigContextProvider, useWatchLLMInferenceServiceConfigs],
    ['routing', RoutingConfigContextProvider, useWatchRouterConfigs],
    ['topology', TopologyConfigContextProvider, useWatchTopologyConfigs],
  ] as const)(
    'should watch %s configs in the current host namespace without Redux',
    (_name, Provider, watch) => {
      const { coreApi } = createTestProviders();
      const renderProvider = (namespace: string) => (
        <HostApiCoreContext.Provider value={{ ...coreApi, dashboardNamespace: namespace }}>
          <Provider>
            <div>Settings</div>
          </Provider>
        </HostApiCoreContext.Provider>
      );
      const { rerender } = render(renderProvider('first-dashboard'));
      expect(jest.mocked(watch).mock.calls.at(-1)?.[0]).toBe('first-dashboard');

      rerender(renderProvider('second-dashboard'));
      expect(jest.mocked(watch).mock.calls.at(-1)?.[0]).toBe('second-dashboard');
    },
  );

  it.each(['routing', 'topology'] as const)(
    'should delete %s configs using the latest host namespace',
    async (refType) => {
      const { coreApi } = createTestProviders();
      const config = mockLLMInferenceServiceConfigK8sResource({ namespace: 'source-namespace' });
      const DeleteConfigHarness = () => {
        const { deleteConfig, setDeleteConfig, handleDelete } =
          useDeleteLlmInferenceServiceConfig(refType);
        return (
          <>
            <button data-testid="select-config" onClick={() => setDeleteConfig(config)}>
              Select configuration
            </button>
            <button data-testid="delete-config" disabled={!deleteConfig} onClick={handleDelete}>
              Delete configuration
            </button>
          </>
        );
      };
      const Host: React.FC<{ namespace: string }> = ({ namespace }) => {
        const value = React.useMemo(
          () => ({ ...coreApi, dashboardNamespace: namespace }),
          [namespace],
        );
        return (
          <HostApiCoreContext.Provider value={value}>
            <DeleteConfigHarness />
          </HostApiCoreContext.Provider>
        );
      };
      const { rerender } = render(<Host namespace="first-dashboard" />);
      fireEvent.click(screen.getByTestId('select-config'));
      rerender(<Host namespace="second-dashboard" />);
      const deleteButton = screen.getByTestId('delete-config');
      expect(deleteButton).toBeEnabled();
      jest.mocked(deleteLlmInferenceServiceConfigIfUnreferenced).mockResolvedValue('deleted');

      fireEvent.click(deleteButton);

      await waitFor(() => expect(deleteButton).toBeDisabled());
      expect(deleteLlmInferenceServiceConfigIfUnreferenced).toHaveBeenCalledWith(
        config.metadata.name,
        'second-dashboard',
        refType,
      );
    },
  );
});

describe('settings form host services', () => {
  const cases = ['accelerator', 'topology', 'routing'] as const;

  const renderForm = (kind: (typeof cases)[number]) => {
    const providers = createTestProviders({ dashboardNamespace: 'custom-dashboard' });
    const source = mockLLMInferenceServiceConfigK8sResource({
      name: 'source-config',
      namespace: 'source-namespace',
      topologyType: TopologyType.SINGLE_NODE,
      supportedTopologies: [TopologyType.SINGLE_NODE],
    });
    const form =
      kind === 'accelerator' ? (
        <LlmAcceleratorConfigFormBody mode="duplicate" sourceConfig={source} />
      ) : kind === 'topology' ? (
        <TopologyConfigurationCreateEdit isDuplicate />
      ) : (
        <RoutingConfigurationCreateEdit isDuplicate />
      );
    render(
      <MemoryRouter initialEntries={['/duplicate/source-config']}>
        <TopologyConfigContext.Provider value={{ configs: [source] }}>
          <RoutingConfigContext.Provider value={{ configs: [source] }}>
            <Routes>
              <Route path="/duplicate/:configName" element={form} />
            </Routes>
          </RoutingConfigContext.Provider>
        </TopologyConfigContext.Provider>
      </MemoryRouter>,
      { wrapper: providers.wrapper },
    );
    return {
      ...providers,
      submitId: kind === 'accelerator' ? 'submit-button' : `submit-${kind}-config-button`,
    };
  };

  it.each(cases)('should create a %s config in the host namespace', async (kind) => {
    jest
      .mocked(createLLMInferenceServiceConfig)
      .mockResolvedValue(mockLLMInferenceServiceConfigK8sResource({}));
    const { submitId } = renderForm(kind);

    fireEvent.click(screen.getByTestId(submitId));

    await waitFor(() =>
      expect(createLLMInferenceServiceConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ namespace: 'custom-dashboard' }),
        }),
      ),
    );
  });

  it.each(['topology', 'routing'] as const)(
    'should deliver %s creation failures to the host notification provider',
    async (kind) => {
      jest.mocked(createLLMInferenceServiceConfig).mockRejectedValue(new Error('Create denied'));
      const { notification, submitId } = renderForm(kind);

      fireEvent.click(screen.getByTestId(submitId));

      await waitFor(() =>
        expect(notification.error).toHaveBeenCalledWith(
          'Error creating configuration',
          'Create denied',
        ),
      );
    },
  );
});
