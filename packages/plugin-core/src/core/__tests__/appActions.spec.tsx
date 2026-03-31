import React from 'react';
import { renderHook } from '@testing-library/react';
import { AppActionsContext, useAppActions, type AppActions } from '../app-actions';

const mockAppActions: AppActions = {
  navigate: jest.fn(),
  notification: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  openModal: jest.fn(() => ({ close: jest.fn() })),
};

describe('useAppActions', () => {
  it('should throw when used outside of a provider', () => {
    expect(() => renderHook(() => useAppActions())).toThrow(
      'useAppActions must be used within an AppActionsProvider',
    );
  });

  it('should return app actions when used within a provider', () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <AppActionsContext.Provider value={mockAppActions}>{children}</AppActionsContext.Provider>
    );

    const { result } = renderHook(() => useAppActions(), { wrapper });

    expect(result.current).toBe(mockAppActions);
    expect(typeof result.current.navigate).toBe('function');
    expect(typeof result.current.notification.success).toBe('function');
    expect(typeof result.current.notification.error).toBe('function');
    expect(typeof result.current.notification.info).toBe('function');
    expect(typeof result.current.notification.warning).toBe('function');
    expect(typeof result.current.openModal).toBe('function');
  });
});
