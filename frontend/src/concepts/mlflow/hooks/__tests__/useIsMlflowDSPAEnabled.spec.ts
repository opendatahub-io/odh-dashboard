import { testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { DSPAMlflowIntegrationMode, ProjectKind } from '#~/k8sTypes';
import useIsMlflowDSPAEnabled from '#~/concepts/mlflow/hooks/useIsMlflowDSPAEnabled';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const basePipelinesAPI = {
  namespace: 'test-ns',
  project: {} as ProjectKind,
  refreshAllAPI: jest.fn(),
  getRecurringRunInformation: jest.fn(),
  metadataStoreServiceClient: {} as never,
  refreshState: jest.fn(),
  managedPipelines: undefined,
  mlflowIntegrationMode: undefined,
  apiAvailable: false,
  api: {} as never,
  pipelineLoadError: undefined,
};

describe('useIsMlflowDSPAEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return enabled=false, loaded=false while DSPA is initializing', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: true,
        installed: false,
        compatible: false,
        timedOut: false,
        name: '',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: undefined,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: false, loaded: false });
  });

  it('should return enabled=false, loaded=true when pipelines server is not installed', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: false,
        installed: false,
        compatible: false,
        timedOut: false,
        name: '',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: undefined,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: false, loaded: true });
  });

  it('should return enabled=true when integrationMode is undefined (omitted)', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: undefined,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: true, loaded: true });
  });

  it('should return enabled=true when integrationMode is AUTODETECT', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: true, loaded: true });
  });

  it('should return enabled=false when integrationMode is DISABLED', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: DSPAMlflowIntegrationMode.DISABLED,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: false, loaded: true });
  });

  it('should return enabled=false for unknown integrationMode values', () => {
    mockUsePipelinesAPI.mockReturnValue({
      ...basePipelinesAPI,
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: undefined,
        isStarting: false,
      },
      mlflowIntegrationMode: 'SomeFutureValue' as DSPAMlflowIntegrationMode,
    });

    const renderResult = testHook(useIsMlflowDSPAEnabled)();
    expect(renderResult.result.current).toStrictEqual({ enabled: false, loaded: true });
  });
});
