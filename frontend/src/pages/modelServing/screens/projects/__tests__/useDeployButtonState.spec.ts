import { renderHook } from '@testing-library/react';
import useDeployButtonState from '~/pages/modelServing/screens/projects/useDeployButtonState';
import { DEPLOY_BUTTON_TOOLTIP } from '~/pages/modelServing/screens/const';

jest.mock('~/concepts/areas', () => ({
  useIsAreaAvailable: jest.fn(),
  SupportedArea: { MODEL_SERVING: 'MODEL_SERVING' },
}));
jest.mock('~/pages/modelServing/useServingPlatformStatuses', () => jest.fn());

const mockUseIsAreaAvailable = require('~/concepts/areas').useIsAreaAvailable;
const mockUseServingPlatformStatuses = require('~/pages/modelServing/useServingPlatformStatuses');

describe('useDeployButtonState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns visible: false if model serving is disabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false });
    mockUseServingPlatformStatuses.mockReturnValue({
      platformEnabledCount: 1,
      kServe: { enabled: true },
    });

    const { result } = renderHook(() => useDeployButtonState(false));
    expect(result.current).toEqual({ visible: false });
  });

  it('returns disabled with tooltip if no serving platforms are enabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true });
    mockUseServingPlatformStatuses.mockReturnValue({
      platformEnabledCount: 0,
      kServe: { enabled: false },
    });

    const { result } = renderHook(() => useDeployButtonState(false));
    expect(result.current).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    });
  });

  it('returns disabled with tooltip if OCI model and kserve is not enabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true });
    mockUseServingPlatformStatuses.mockReturnValue({
      platformEnabledCount: 1,
      kServe: { enabled: false },
    });

    const { result } = renderHook(() => useDeployButtonState(true));
    expect(result.current).toEqual({
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    });
  });

  it('returns enabled if model serving and platform are enabled, not OCI', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true });
    mockUseServingPlatformStatuses.mockReturnValue({
      platformEnabledCount: 1,
      kServe: { enabled: true },
    });

    const { result } = renderHook(() => useDeployButtonState(false));
    expect(result.current).toEqual({
      visible: true,
      enabled: true,
    });
  });

  it('returns enabled if model serving and platform are enabled, OCI, and kserve is enabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true });
    mockUseServingPlatformStatuses.mockReturnValue({
      platformEnabledCount: 1,
      kServe: { enabled: true },
    });

    const { result } = renderHook(() => useDeployButtonState(true));
    expect(result.current).toEqual({
      visible: true,
      enabled: true,
    });
  });
});
