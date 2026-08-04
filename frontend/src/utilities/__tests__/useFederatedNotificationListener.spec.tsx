import React from 'react';
import { render, act } from '@testing-library/react';
import { AlertVariant } from '@patternfly/react-core';
import {
  isSafeUrl,
  useFederatedNotificationListener,
} from '#~/utilities/useFederatedNotificationListener';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('#~/redux/actions/actions', () => ({
  addNotification: (payload: unknown) => ({ type: 'ADD_NOTIFICATION', payload }),
}));

describe('isSafeUrl', () => {
  it('should allow relative paths starting with /', () => {
    expect(isSafeUrl('/projects')).toBe(true);
    expect(isSafeUrl('/model-registry/details')).toBe(true);
    expect(isSafeUrl('/')).toBe(true);
  });

  it('should allow http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('should allow https URLs', () => {
    expect(isSafeUrl('https://example.com/path')).toBe(true);
  });

  it('should reject javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('should reject javascript: URLs with mixed case', () => {
    expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
  });

  it('should reject data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('should reject vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:MsgBox("xss")')).toBe(false);
  });

  it('should reject URLs with unknown protocols', () => {
    expect(isSafeUrl('ftp://example.com')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isSafeUrl('')).toBe(false);
  });
});

const TestComponent: React.FC = () => {
  useFederatedNotificationListener();
  return <div data-testid="test-component" />;
};

const dispatchBridgeEvent = (detail: Record<string, unknown>) => {
  const event = new CustomEvent('odh-notification-bridge', { detail });
  act(() => {
    window.dispatchEvent(event);
  });
};

describe('useFederatedNotificationListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dispatch notification for events with safe linkUrl', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'Test',
      message: 'A message',
      linkUrl: '/safe/path',
      linkLabel: 'Click here',
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.title).toBe('Test');
    expect(action.payload.message).not.toBe('A message');
  });

  it('should strip linkUrl and render plain message for javascript: URLs', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'XSS attempt',
      message: 'Click the link',
      linkUrl: 'javascript:alert(document.cookie)',
      linkLabel: 'Click here',
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.message).toBe('Click the link');
  });

  it('should strip linkUrl for data: URLs', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'Data URL',
      message: 'A message',
      linkUrl: 'data:text/html,<script>alert(1)</script>',
      linkLabel: 'Click here',
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.message).toBe('A message');
  });

  it('should render link for https URLs', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'HTTPS',
      message: 'A message',
      linkUrl: 'https://example.com',
      linkLabel: 'Click here',
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.message).not.toBe('A message');
  });

  it('should handle events without linkUrl', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'No link',
      message: 'Plain message',
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.message).toBe('Plain message');
  });

  it('should handle events without detail', () => {
    render(<TestComponent />);

    const event = new CustomEvent('odh-notification-bridge', { detail: null });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should use default info status when status is not provided', () => {
    render(<TestComponent />);

    dispatchBridgeEvent({
      title: 'Info',
      message: 'Default status',
    });

    const action = mockDispatch.mock.calls[0][0];
    expect(action.payload.status).toBe(AlertVariant.info);
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<TestComponent />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'odh-notification-bridge',
      expect.any(Function),
    );
    removeEventListenerSpy.mockRestore();
  });
});
