import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useIlabPipeline } from '#~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useContinueState } from '#~/pages/pipelines/global/modelCustomization/startRunModal/useContinueState';

jest.mock('#~/concepts/pipelines/context');
jest.mock('#~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline');

describe('useContinueState', () => {
  const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;
  const mockUseIlabPipeline = useIlabPipeline as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is loading and cannot continue because the pipeline server is initializing', () => {
    mockUsePipelinesAPI.mockReturnValue({ pipelinesServer: { initializing: true } });
    mockUseIlabPipeline.mockReturnValue([null, false, null]);

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({ canContinue: false, isLoading: true });
  });

  it('is loading and cannot continue because the ilab pipeline is not loaded', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: { initializing: false, installed: true },
    });
    mockUseIlabPipeline.mockReturnValue([null, false, null]);

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({ canContinue: false, isLoading: true });
  });

  it('cannot continue because the pipeline server is not accessible', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: {
        initializing: false,
        installed: false,
        compatible: false,
        timedOut: false,
      },
    });
    mockUseIlabPipeline.mockReturnValue([null, true, null]);

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({
      canContinue: false,
      isLoading: false,
      unmetCondition: 'pipelineServerAccessible',
    });
  });

  it('cannot continue because the pipeline server is not online', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: { initializing: false, installed: true, compatible: true, timedOut: true },
    });
    mockUseIlabPipeline.mockReturnValue({ loaded: true, loadError: null });

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({
      canContinue: false,
      isLoading: false,
      unmetCondition: 'pipelineServerOnline',
    });
  });

  it('cannot continue because the pipeline server is not configured properly', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: { initializing: false, installed: true, compatible: false, timedOut: false },
    });
    mockUseIlabPipeline.mockReturnValue({ loaded: false, loadError: new Error('Load error') });

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({
      canContinue: false,
      isLoading: false,
      unmetCondition: 'pipelineServerConfigured',
    });
  });

  it('cannot continue because the ilab pipeline is not installed properly', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: { initializing: false, installed: true, compatible: true, timedOut: false },
    });
    mockUseIlabPipeline.mockReturnValue({ loaded: true, loadError: null });

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({
      canContinue: false,
      isLoading: false,
      unmetCondition: 'ilabPipelineInstalled',
    });
  });

  it('can continue because all conditions are met', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: { initializing: false, installed: true, compatible: true, timedOut: false },
    });
    mockUseIlabPipeline.mockReturnValue({ loaded: true, loadError: null, ilabPipeline: {} });

    const renderResult = testHook(useContinueState)();
    expect(renderResult.result.current).toEqual({ canContinue: true, isLoading: false });
  });
});
