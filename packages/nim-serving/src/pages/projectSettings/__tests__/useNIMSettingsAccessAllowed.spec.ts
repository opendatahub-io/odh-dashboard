import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR';
import { useNIMSettingsAccessAllowed } from '../useNIMSettingsAccessAllowed';

jest.mock('@odh-dashboard/internal/concepts/userSSAR', () => ({
  useAccessAllowed: jest.fn(),
}));

const mockUseAccessAllowed = jest.mocked(useAccessAllowed);

describe('useNIMSettingsAccessAllowed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report not loaded with undefined allowed when any review is loading', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // account create loaded
      .mockReturnValueOnce([true, true]) // account delete loaded
      .mockReturnValueOnce([false, false]) // secret create still loading
      .mockReturnValueOnce([false, false]) // secret update still loading
      .mockReturnValueOnce([false, false]); // secret delete still loading

    const renderResult = testHook(useNIMSettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: false, allowed: undefined });
  });

  it('should report not allowed when account delete is denied', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // account create allowed
      .mockReturnValueOnce([false, true]) // account delete denied
      .mockReturnValueOnce([true, true]) // secret create allowed
      .mockReturnValueOnce([true, true]) // secret update allowed
      .mockReturnValueOnce([true, true]); // secret delete allowed

    const renderResult = testHook(useNIMSettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: false });
  });

  it('should report not allowed when secret create is denied', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // account create allowed
      .mockReturnValueOnce([true, true]) // account delete allowed
      .mockReturnValueOnce([false, true]) // secret create denied
      .mockReturnValueOnce([true, true]) // secret update allowed
      .mockReturnValueOnce([true, true]); // secret delete allowed

    const renderResult = testHook(useNIMSettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: false });
  });

  it('should report not allowed when secret update is denied', () => {
    mockUseAccessAllowed
      .mockReturnValueOnce([true, true]) // account create allowed
      .mockReturnValueOnce([true, true]) // account delete allowed
      .mockReturnValueOnce([true, true]) // secret create allowed
      .mockReturnValueOnce([false, true]) // secret update denied
      .mockReturnValueOnce([true, true]); // secret delete allowed

    const renderResult = testHook(useNIMSettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: false });
  });

  it('should report allowed when all permissions are granted', () => {
    mockUseAccessAllowed.mockReturnValue([true, true]);

    const renderResult = testHook(useNIMSettingsAccessAllowed)('test-ns');
    expect(renderResult.result.current).toEqual({ loaded: true, allowed: true });
  });
});
