import { testHook } from '@odh-dashboard/jest-config/hooks';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import useIsMlflowCRAvailable from '#~/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import useIsMlflowDSPAEnabled from '#~/concepts/mlflow/hooks/useIsMlflowDSPAEnabled';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/mlflow/hooks/useIsMlflowCRAvailable');
jest.mock('#~/concepts/mlflow/hooks/useIsMlflowDSPAEnabled');

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseIsMlflowCRAvailable = jest.mocked(useIsMlflowCRAvailable);
const mockUseIsMlflowDSPAEnabled = jest.mocked(useIsMlflowDSPAEnabled);

const mockPipelinesAreaAvailable = (status: boolean) => {
  mockUseIsAreaAvailable.mockReturnValue({
    status,
    devFlags: null,
    featureFlags: null,
    reliantAreas: null,
    requiredComponents: null,
    requiredCapabilities: null,
    customCondition: () => false,
  });
};

describe('useIsMlflowPipelinesAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPipelinesAreaAvailable(true);
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: true, loaded: true });
    mockUseIsMlflowDSPAEnabled.mockReturnValue({ enabled: true, loaded: true });
  });

  it('should check MLFLOW_PIPELINES area', () => {
    testHook(useIsMlflowPipelinesAvailable)();
    expect(mockUseIsAreaAvailable).toHaveBeenCalledWith(SupportedArea.MLFLOW_PIPELINES);
  });

  it('should return available=true when all conditions are met', () => {
    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: true, loaded: true });
  });

  it('should return available=false when CR is not available', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: true });

    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true });
  });

  it('should return available=false when pipelines area is not available', () => {
    mockPipelinesAreaAvailable(false);

    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true });
  });

  it('should return available=false when DSPA integration is disabled', () => {
    mockUseIsMlflowDSPAEnabled.mockReturnValue({ enabled: false, loaded: true });

    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true });
  });

  it('should return loaded=false while BFF status is still loading', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: false });

    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: false });
  });

  it('should return loaded=false while DSPA is still initializing', () => {
    mockUseIsMlflowDSPAEnabled.mockReturnValue({ enabled: false, loaded: false });

    const { result } = testHook(useIsMlflowPipelinesAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: false });
  });
});
