import { testHook } from '@odh-dashboard/jest-config/hooks';
import {
  SupportedArea,
  useIsAreaAvailable,
  type IsAreaAvailableStatus,
} from '@odh-dashboard/plugin-core/areas';
import { useIsDRAHardwareProfileEnabled } from '@odh-dashboard/hardware-profiles/shared/useIsDRAHardwareProfileEnabled';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const useIsAreaAvailableMock = jest.mocked(useIsAreaAvailable);

const mockAreaStatus = (status: boolean): IsAreaAvailableStatus => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredComponents: null,
  requiredCapabilities: null,
});

describe('useIsDRAHardwareProfileEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when the DRA hardware profile area is available', () => {
    useIsAreaAvailableMock.mockReturnValue(mockAreaStatus(true));

    const renderResult = testHook(useIsDRAHardwareProfileEnabled)();

    expect(renderResult).hookToBe(true);
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(useIsAreaAvailableMock).toHaveBeenCalledWith(SupportedArea.HARDWARE_PROFILE_DRA);
  });

  it('should return false when the DRA hardware profile area is not available', () => {
    useIsAreaAvailableMock.mockReturnValue(mockAreaStatus(false));

    const renderResult = testHook(useIsDRAHardwareProfileEnabled)();

    expect(renderResult).hookToBe(false);
    expect(useIsAreaAvailableMock).toHaveBeenCalledWith(SupportedArea.HARDWARE_PROFILE_DRA);
  });
});
