import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { NotificationContext, useNotification, type NotificationAPI } from '../NotificationContext';

const createMockNotificationAPI = (): NotificationAPI => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
});

describe('useNotification', () => {
  it('should return no-op emitters when no provider is present', () => {
    const { result } = renderHook(() => useNotification());

    expect(() => {
      result.current.success('title');
      result.current.error('title');
      result.current.info('title');
      result.current.warning('title');
    }).not.toThrow();
  });

  it('should return the host-provided notification API when a provider is present', () => {
    const api = createMockNotificationAPI();
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <NotificationContext.Provider value={api}>{children}</NotificationContext.Provider>
    );

    const { result } = renderHook(() => useNotification(), { wrapper });
    result.current.success('Registered as kubernetes/mcp-server v1.0.0');

    expect(api.success).toHaveBeenCalledTimes(1);
    expect(api.success).toHaveBeenCalledWith('Registered as kubernetes/mcp-server v1.0.0');
    expect(api.error).not.toHaveBeenCalled();
  });
});
