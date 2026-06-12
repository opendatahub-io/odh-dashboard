import { testHook } from '@odh-dashboard/jest-config/hooks';
import { AlertVariant } from '@patternfly/react-core';
import useNotification from '#~/utilities/useNotification';

const mockAddNotification = jest.fn();

jest.mock('#~/concepts/notifications/DashboardNotificationContext', () => ({
  useAddNotification: () => mockAddNotification,
}));

describe('useNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success, error, info, and warning functions', () => {
    const renderResult = testHook(useNotification)();
    const result = renderResult.result.current;

    expect(typeof result.success).toBe('function');
    expect(typeof result.error).toBe('function');
    expect(typeof result.info).toBe('function');
    expect(typeof result.warning).toBe('function');
  });

  it('should call addNotification with success variant', () => {
    const renderResult = testHook(useNotification)();
    renderResult.result.current.success('Success title', 'Success message');

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Success title',
        message: 'Success message',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should call addNotification with danger variant for error', () => {
    const renderResult = testHook(useNotification)();
    renderResult.result.current.error('Error title', 'Error message');

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error title',
        message: 'Error message',
      }),
    );
  });

  it('should call addNotification with info variant', () => {
    const renderResult = testHook(useNotification)();
    renderResult.result.current.info('Info title');

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.info,
        title: 'Info title',
      }),
    );
  });

  it('should call addNotification with warning variant', () => {
    const renderResult = testHook(useNotification)();
    renderResult.result.current.warning('Warning title', 'Warning message');

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.warning,
        title: 'Warning title',
        message: 'Warning message',
      }),
    );
  });

  it('should pass actions to addNotification', () => {
    const renderResult = testHook(useNotification)();
    const actions = [{ title: 'Retry', onClick: jest.fn() }];

    renderResult.result.current.error('Error', 'Something failed', actions);

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error',
        message: 'Something failed',
        actions,
      }),
    );
  });

  it('should handle calls without message', () => {
    const renderResult = testHook(useNotification)();
    renderResult.result.current.success('Title only');

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Title only',
        message: undefined,
      }),
    );
  });
});
