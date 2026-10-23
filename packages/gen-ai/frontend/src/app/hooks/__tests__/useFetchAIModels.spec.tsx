/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ApplicationsPage } from 'mod-arch-shared';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchAIModels, { isValidAAModel } from '~/app/hooks/useFetchAIModels';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useGenAiDashboardConfig from '~/app/hooks/useGenAiDashboardConfig';
import useAiAssetModelAsServiceEnabled from '~/app/hooks/useAiAssetModelAsServiceEnabled';

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(),
}));

jest.mock('~/app/hooks/useGenAiDashboardConfig', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useAiAssetModelAsServiceEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const validModel = {
  model_name: 'test',
  model_id: 'test-id',
  serving_runtime: 'vllm',
  api_protocol: 'REST',
  version: '1',
  usecase: 'LLM',
  description: 'A model',
  status: 'Running',
  display_name: 'Test Model',
  model_source_type: 'namespace',
  endpoints: ['internal:http://svc.local:8080'],
};

// Stateful content represents the conversation and trace drawer inside ApplicationsPage.
const Conversation: React.FC = () => {
  const [message, setMessage] = React.useState('');
  const [traceOpen, setTraceOpen] = React.useState(false);
  return (
    <>
      <input
        data-testid="conversation"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <button type="button" data-testid="view-trace" onClick={() => setTraceOpen(true)}>
        View trace
      </button>
      {traceOpen && <div data-testid="trace-panel">Trace details</div>}
    </>
  );
};

const ModelsPage: React.FC = () => {
  const { loaded } = useFetchAIModels();
  return (
    <ApplicationsPage title="Playground" description="" loaded={loaded} empty={false}>
      <Conversation />
    </ApplicationsPage>
  );
};

describe('isValidAAModel', () => {
  it('accepts a valid namespace model', () => {
    expect(isValidAAModel(validModel)).toBe(true);
  });

  it('accepts a valid maas model', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'maas' })).toBe(true);
  });

  it('accepts a valid custom_endpoint model', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'custom_endpoint' })).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidAAModel(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidAAModel(undefined)).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isValidAAModel('not-an-object')).toBe(false);
  });

  it('rejects when a required string field is missing', () => {
    const noName = { ...validModel } as Record<string, unknown>;
    delete noName.model_name;
    expect(isValidAAModel(noName)).toBe(false);
  });

  it('rejects when a required string field is a number', () => {
    expect(isValidAAModel({ ...validModel, model_id: 42 })).toBe(false);
  });

  it('rejects an unknown model_source_type', () => {
    expect(isValidAAModel({ ...validModel, model_source_type: 'unknown_type' })).toBe(false);
  });

  it('rejects when endpoints is not an array', () => {
    expect(isValidAAModel({ ...validModel, endpoints: 'not-array' })).toBe(false);
  });

  it('rejects endpoints containing null', () => {
    expect(isValidAAModel({ ...validModel, endpoints: ['http://valid.com', null] })).toBe(false);
  });

  it('rejects endpoints containing objects', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [{ url: 'http://bad.com' }] })).toBe(false);
  });

  it('rejects endpoints containing numbers', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [123] })).toBe(false);
  });

  it('accepts empty endpoints array', () => {
    expect(isValidAAModel({ ...validModel, endpoints: [] })).toBe(true);
  });
});

describe('useFetchAIModels config refresh', () => {
  let contextValue: React.ContextType<typeof GenAiContext>;
  let getAAModels: jest.MockedFunction<typeof mockGenAiContextValue.apiState.api.getAAModels>;

  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <GenAiContext.Provider value={contextValue}>{children}</GenAiContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getAAModels = jest.fn().mockResolvedValue([
      {
        ...validModel,
        model_source_type: 'custom_endpoint',
        endpoints: ['https://model.example.com/v1'],
      },
    ]);
    contextValue = {
      ...mockGenAiContextValue,
      namespace: { name: 'test-namespace', displayName: 'Test Namespace' },
      apiState: {
        apiAvailable: true,
        api: { ...mockGenAiContextValue.apiState.api, getAAModels },
      },
    };
    jest.mocked(useGenAiAPI).mockReturnValue({
      ...contextValue.apiState,
      refreshAllAPI: jest.fn(),
    });
    jest.mocked(useAiAssetModelAsServiceEnabled).mockReturnValue(false);
    jest.mocked(useGenAiDashboardConfig).mockReturnValue({
      aiAssetCustomEndpoints: { externalProviders: true, clusterDomains: [] },
    });
  });

  it.each([{ clusterDomains: [] }, { clusterDomains: ['.example.com'] }])(
    'should preserve loaded models across equivalent domain arrays ($clusterDomains)',
    async ({ clusterDomains }) => {
      jest.mocked(useGenAiDashboardConfig).mockReturnValue({
        aiAssetCustomEndpoints: { externalProviders: true, clusterDomains },
      });
      const hook = jest.fn(useFetchAIModels);
      const { result, rerender } = renderHook(() => hook(), { wrapper });
      await waitFor(() => expect(result.current.loaded).toBe(true));
      expect(hook).toHaveBeenCalledTimes(2);
      const previousData = result.current.data;

      // A different raw config response can replace nested arrays even when the
      // effective domain configuration is unchanged (for example dev-flag polling).
      jest.mocked(useGenAiDashboardConfig).mockReturnValue({
        aiAssetCustomEndpoints: { externalProviders: false, clusterDomains: [...clusterDomains] },
      });
      rerender();

      expect(result.current.loaded).toBe(true);
      expect(result.current.data).toBe(previousData);
      expect(getAAModels).toHaveBeenCalledTimes(1);
      expect(hook).toHaveBeenCalledTimes(3);
    },
  );

  it('should treat missing and empty cluster domains as equivalent', async () => {
    jest.mocked(useGenAiDashboardConfig).mockReturnValue(undefined);
    const { result, rerender } = renderHook(() => useFetchAIModels(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    jest.mocked(useGenAiDashboardConfig).mockReturnValue({
      aiAssetCustomEndpoints: { clusterDomains: [] },
    });
    rerender();

    expect(result.current.loaded).toBe(true);
    expect(getAAModels).toHaveBeenCalledTimes(1);
  });

  it('should reclassify endpoints when cluster domains change', async () => {
    const { result, rerender } = renderHook(() => useFetchAIModels(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data[0].externalEndpoint).toBe('https://model.example.com/v1');

    jest.mocked(useGenAiDashboardConfig).mockReturnValue({
      aiAssetCustomEndpoints: { clusterDomains: ['.example.com'] },
    });
    rerender();

    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data[0].internalEndpoint).toBe('https://model.example.com/v1');
    expect(result.current.data[0].externalEndpoint).toBeUndefined();
    expect(getAAModels).toHaveBeenCalledTimes(2);
  });

  it('should clear stale models and refetch when the namespace changes', async () => {
    const { result, rerender } = renderHook(() => useFetchAIModels(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    contextValue = { ...contextValue, namespace: { name: 'another-namespace' } };
    rerender();

    expect(result.current.loaded).toBe(false);
    expect(result.current.data).toEqual([]);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(getAAModels).toHaveBeenCalledTimes(2);
  });

  it('should preserve conversation and drawer state across an equivalent config refresh', async () => {
    const { rerender } = render(<ModelsPage />, { wrapper });
    await screen.findByTestId('conversation');
    fireEvent.change(screen.getByTestId('conversation'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByTestId('view-trace'));
    expect(screen.getByTestId('trace-panel')).toBeVisible();

    jest.mocked(useGenAiDashboardConfig).mockReturnValue({
      aiAssetCustomEndpoints: { externalProviders: true, clusterDomains: [] },
    });
    rerender(<ModelsPage />);
    // Flush pending fetch effects too: a short loading transition is enough to
    // unmount the children and permanently discard their state.
    await act(async () => undefined);

    expect(screen.getByTestId('conversation')).toHaveValue('Hello');
    expect(screen.getByTestId('trace-panel')).toBeVisible();
    expect(getAAModels).toHaveBeenCalledTimes(1);
  });
});
