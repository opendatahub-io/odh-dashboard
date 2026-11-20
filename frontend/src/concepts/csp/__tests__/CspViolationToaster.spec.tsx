import * as React from 'react';
import { render, act } from '@testing-library/react';
import { NotificationContext, type NotificationAPI } from '@odh-dashboard/ui-core';
import { clearCspViolationThrottle } from '#~/concepts/csp/cspViolations';
import { CspViolationToaster } from '#~/concepts/csp/CspViolationToaster';

const makeViolation = (effectiveDirective: string, blockedURI: string): Event =>
  Object.assign(new Event('securitypolicyviolation'), {
    effectiveDirective,
    violatedDirective: effectiveDirective,
    blockedURI,
    disposition: 'enforce',
    sourceFile: '',
    lineNumber: 0,
    columnNumber: 0,
    sample: '',
    referrer: '',
    originalPolicy: '',
  });

const notification = (): NotificationAPI => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
});

describe('CspViolationToaster', () => {
  beforeEach(() => {
    clearCspViolationThrottle(window.localStorage);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(<CspViolationToaster />);
    expect(container.childElementCount).toBe(0);
  });

  it('shows a warning toast for each unique violation in dev mode', () => {
    const api = notification();
    render(
      <NotificationContext.Provider value={api}>
        <CspViolationToaster devMode />
      </NotificationContext.Provider>,
    );

    act(() => {
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/a.js'));
      // Same directive + host: not a second toast.
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/b.js'));
    });

    expect(api.warning).toHaveBeenCalledTimes(1);
    expect(api.warning).toHaveBeenCalledWith(
      'CSP violation: script-src',
      'Blocked evil.example on /',
    );
  });

  it('does not toast outside dev mode but still captures', () => {
    const api = notification();
    render(
      <NotificationContext.Provider value={api}>
        <CspViolationToaster devMode={false} />
      </NotificationContext.Provider>,
    );

    act(() => {
      document.dispatchEvent(makeViolation('img-src', 'https://evil.example/a.png'));
    });

    expect(api.warning).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
