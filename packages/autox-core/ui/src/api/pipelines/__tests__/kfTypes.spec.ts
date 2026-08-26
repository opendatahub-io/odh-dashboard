import { isRunInTerminalState } from '../kfTypes';

describe('isRunInTerminalState', () => {
  it('should return true for terminal states', () => {
    expect(isRunInTerminalState('SUCCEEDED')).toBe(true);
    expect(isRunInTerminalState('FAILED')).toBe(true);
    expect(isRunInTerminalState('CANCELED')).toBe(true);
    expect(isRunInTerminalState('SKIPPED')).toBe(true);
    expect(isRunInTerminalState('CACHED')).toBe(true);
  });

  it('should normalize case and whitespace', () => {
    expect(isRunInTerminalState(' succeeded ')).toBe(true);
  });

  it('should return false for non-terminal or invalid states', () => {
    expect(isRunInTerminalState('RUNNING')).toBe(false);
    expect(isRunInTerminalState('')).toBe(false);
    expect(isRunInTerminalState(undefined)).toBe(false);
  });
});
