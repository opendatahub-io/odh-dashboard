import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AlertVariant } from '@patternfly/react-core';
import { useNotification } from '~/app/hooks/useNotification';
import { useStore } from '~/app/store';

// Mock the store
jest.mock('~/app/store', () => ({
  useStore: jest.fn(),
}));

const mockUseStore = jest.mocked(useStore);

describe('useNotification', () => {
  const mockAddNotification = jest.fn();
  const mockRemoveNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockImplementation((selector) => {
      const state = {
        addNotification: mockAddNotification,
        removeNotification: mockRemoveNotification,
        notifications: [],
      };
      return selector(state);
    });
  });

  it('should create success notification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success('Success Title');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Success Title',
        message: undefined,
        actions: undefined,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create success notification with message', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success('Success Title', 'Success message');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Success Title',
        message: 'Success message',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create success notification with actions', () => {
    const { result } = renderHook(() => useNotification());
    const mockAction = { title: 'Action', onClick: jest.fn() };

    act(() => {
      result.current.success('Success Title', 'Message', [mockAction]);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Success Title',
        message: 'Message',
        actions: [mockAction],
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create error notification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.error('Error Title');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error Title',
        message: undefined,
        actions: undefined,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create error notification with message', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.error('Error Title', 'Error message');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error Title',
        message: 'Error message',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create error notification with actions', () => {
    const { result } = renderHook(() => useNotification());
    const mockAction = { title: 'Retry', onClick: jest.fn() };

    act(() => {
      result.current.error('Error Title', 'Error message', [mockAction]);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error Title',
        message: 'Error message',
        actions: [mockAction],
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create warning notification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.warning('Warning Title');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.warning,
        title: 'Warning Title',
        message: undefined,
        actions: undefined,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create warning notification with message', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.warning('Warning Title', 'Warning message');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.warning,
        title: 'Warning Title',
        message: 'Warning message',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create warning notification with actions', () => {
    const { result } = renderHook(() => useNotification());
    const mockAction = { title: 'Dismiss', onClick: jest.fn() };

    act(() => {
      result.current.warning('Warning Title', 'Warning message', [mockAction]);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.warning,
        title: 'Warning Title',
        message: 'Warning message',
        actions: [mockAction],
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create info notification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.info('Info Title');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.info,
        title: 'Info Title',
        message: undefined,
        actions: undefined,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create info notification with message', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.info('Info Title', 'Info message');
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.info,
        title: 'Info Title',
        message: 'Info message',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create info notification with actions', () => {
    const { result } = renderHook(() => useNotification());
    const mockAction = { title: 'Learn More', onClick: jest.fn() };

    act(() => {
      result.current.info('Info Title', 'Info message', [mockAction]);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.info,
        title: 'Info Title',
        message: 'Info message',
        actions: [mockAction],
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should remove notification by id', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.remove('notification-123');
    });

    expect(mockRemoveNotification).toHaveBeenCalledWith('notification-123');
  });

  it('should have stable callback references', () => {
    const { result, rerender } = renderHook(() => useNotification());

    const firstRenderCallbacks = {
      success: result.current.success,
      error: result.current.error,
      warning: result.current.warning,
      info: result.current.info,
      remove: result.current.remove,
    };

    rerender();

    expect(result.current.success).toBe(firstRenderCallbacks.success);
    expect(result.current.error).toBe(firstRenderCallbacks.error);
    expect(result.current.warning).toBe(firstRenderCallbacks.warning);
    expect(result.current.info).toBe(firstRenderCallbacks.info);
    expect(result.current.remove).toBe(firstRenderCallbacks.remove);
  });

  it('should create notification with React node as message', () => {
    const { result } = renderHook(() => useNotification());

    const messageNode = <span data-testid="custom-message">Custom message content</span>;

    act(() => {
      result.current.success('Title', messageNode);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.success,
        title: 'Title',
        message: messageNode,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create notifications with multiple actions', () => {
    const { result } = renderHook(() => useNotification());

    const actions = [
      { title: 'Action 1', onClick: jest.fn() },
      { title: 'Action 2', onClick: jest.fn() },
      { title: 'Action 3', onClick: jest.fn() },
    ];

    act(() => {
      result.current.error('Error with multiple actions', 'Error message', actions);
    });

    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AlertVariant.danger,
        title: 'Error with multiple actions',
        message: 'Error message',
        actions,
        timestamp: expect.any(Date),
      }),
    );
  });

  it('should create multiple notifications sequentially', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success('First success');
      result.current.error('First error');
      result.current.warning('First warning');
      result.current.info('First info');
    });

    expect(mockAddNotification).toHaveBeenCalledTimes(4);
    expect(mockAddNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: AlertVariant.success, title: 'First success' }),
    );
    expect(mockAddNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: AlertVariant.danger, title: 'First error' }),
    );
    expect(mockAddNotification).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ status: AlertVariant.warning, title: 'First warning' }),
    );
    expect(mockAddNotification).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ status: AlertVariant.info, title: 'First info' }),
    );
  });

  it('should remove multiple notifications', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.remove('id-1');
      result.current.remove('id-2');
      result.current.remove('id-3');
    });

    expect(mockRemoveNotification).toHaveBeenCalledTimes(3);
    expect(mockRemoveNotification).toHaveBeenNthCalledWith(1, 'id-1');
    expect(mockRemoveNotification).toHaveBeenNthCalledWith(2, 'id-2');
    expect(mockRemoveNotification).toHaveBeenNthCalledWith(3, 'id-3');
  });

  it('should return all notification methods', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current).toHaveProperty('success');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('warning');
    expect(result.current).toHaveProperty('info');
    expect(result.current).toHaveProperty('remove');

    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.info).toBe('function');
    expect(typeof result.current.remove).toBe('function');
  });
});
