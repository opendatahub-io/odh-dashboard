import * as React from 'react';
import { render, act } from '@testing-library/react';
import { clearCspViolationThrottle } from '#~/concepts/csp/cspViolations';
import { useCspViolationReporter } from '#~/concepts/csp/useCspViolationReporter';

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

const Probe: React.FC<{
  onViolation?: (report: { effectiveDirective: string }) => void;
  enabled?: boolean;
}> = ({ onViolation, enabled }) => {
  const violations = useCspViolationReporter({ enabled, onViolation });
  return <div data-testid="count">{violations.length}</div>;
};

describe('useCspViolationReporter', () => {
  beforeEach(() => {
    clearCspViolationThrottle(window.localStorage);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('installs the reporter and returns the violations seen this session', () => {
    const { getByTestId } = render(<Probe />);

    act(() => {
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/a.js'));
      document.dispatchEvent(makeViolation('img-src', 'https://evil.example/a.png'));
    });

    expect(getByTestId('count').textContent).toBe('2');
  });

  it('calls onViolation once per unique violation', () => {
    const onViolation = jest.fn();
    render(<Probe onViolation={onViolation} />);

    act(() => {
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/a.js'));
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/b.js'));
    });

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenCalledWith(
      expect.objectContaining({ effectiveDirective: 'script-src', blockedHost: 'evil.example' }),
    );
  });

  it('removes the listener on unmount', () => {
    const { unmount } = render(<Probe />);
    unmount();

    act(() => {
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/a.js'));
    });

    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onViolation = jest.fn();
    const { getByTestId } = render(<Probe enabled={false} onViolation={onViolation} />);

    act(() => {
      document.dispatchEvent(makeViolation('script-src', 'https://evil.example/a.js'));
    });

    expect(getByTestId('count').textContent).toBe('0');
    expect(onViolation).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
