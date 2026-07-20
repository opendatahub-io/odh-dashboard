import { testHook } from '@odh-dashboard/jest-config/hooks';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useMLflowStatus } from '#~/concepts/mlflow/hooks/useMLflowStatus';
import useIsMlflowCRAvailable from '#~/concepts/mlflow/hooks/useIsMlflowCRAvailable';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/mlflow/hooks/useMLflowStatus', () => ({
  useMLflowStatus: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseMLflowStatus = jest.mocked(useMLflowStatus);

const mockAreaAvailable = (status: boolean) => {
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

describe('useIsMlflowCRAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAreaAvailable(true);
    mockUseMLflowStatus.mockReturnValue({ configured: true, loaded: true, error: false });
  });

  it('should use SupportedArea.MLFLOW', () => {
    testHook(useIsMlflowCRAvailable)();
    expect(mockUseIsAreaAvailable).toHaveBeenCalledWith(SupportedArea.MLFLOW);
  });

  it('should pass area availability as shouldFetch to useMLflowStatus', () => {
    testHook(useIsMlflowCRAvailable)();
    expect(mockUseMLflowStatus).toHaveBeenCalledWith(true);

    jest.clearAllMocks();
    mockAreaAvailable(false);
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: false });

    testHook(useIsMlflowCRAvailable)();
    expect(mockUseMLflowStatus).toHaveBeenCalledWith(false);
  });

  it('should return available=false when area is not available', () => {
    mockAreaAvailable(false);
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: false });

    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true, error: false });
  });

  it('should return available=true when BFF reports configured', () => {
    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: true, loaded: true, error: false });
  });

  it('should return available=false and loaded=false when BFF is not loaded yet', () => {
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: false, error: false });

    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: false, error: false });
  });

  it('should return available=false when MLflow is not configured', () => {
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: false });

    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true, error: false });
  });

  it('should return error=true when BFF status check failed', () => {
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: true, error: true });

    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true, error: true });
  });

  it('should return loaded=true when area is disabled (no BFF poll needed)', () => {
    mockAreaAvailable(false);
    mockUseMLflowStatus.mockReturnValue({ configured: false, loaded: false, error: false });

    const { result } = testHook(useIsMlflowCRAvailable)();
    expect(result.current).toStrictEqual({ available: false, loaded: true, error: false });
  });
});
