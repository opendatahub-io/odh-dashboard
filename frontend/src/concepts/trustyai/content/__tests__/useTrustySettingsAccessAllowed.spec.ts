import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useAccessAllowed } from '#~/concepts/userSSAR';
import { useTrustySettingsAccessAllowed } from '#~/concepts/trustyai/content/useTrustySettingsAccessAllowed';

jest.mock('#~/concepts/userSSAR', () => ({
  useAccessAllowed: jest.fn(),
}));

const mockUseAccessAllowed = jest.mocked(useAccessAllowed);

describe('useTrustySettingsAccessAllowed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report not loaded with undefined allowed when any review is loading', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // CR create loaded
      .mockReturnValueOnce([true, true]) // CR delete loaded
      .mockReturnValueOnce([false, false]) // secret create still loading
      .mockReturnValueOnce([false, false]); // secret delete still loading

    const renderResult = testHook(useTrustySettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: false, allowed: undefined });
  });

  it('should report not allowed when CR create is denied', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([false, true]) // CR create denied
      .mockReturnValueOnce([true, true]) // CR delete allowed
      .mockReturnValueOnce([true, true]) // secret create allowed
      .mockReturnValueOnce([true, true]); // secret delete allowed

    const renderResult = testHook(useTrustySettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: false });
  });

  it('should report not allowed when secret delete is denied', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // CR create allowed
      .mockReturnValueOnce([true, true]) // CR delete allowed
      .mockReturnValueOnce([true, true]) // secret create allowed
      .mockReturnValueOnce([false, true]); // secret delete denied

    const renderResult = testHook(useTrustySettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: false });
  });

  it('should report allowed when all permissions are granted', () => {
    mockUseAccessAllowed.mockReturnValue([true, true]);

    const renderResult = testHook(useTrustySettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: true });
  });
});
