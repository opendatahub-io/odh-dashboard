import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { settleAutomlRun } from '../../cypress/utils/oc_commands/automlRunCleanup';

type CommandResult = { exitCode: number; stdout: string; stderr: string };
type CypressMock = {
  exec: jest.Mock<(command: string) => Promise<CommandResult>>;
  wait: jest.Mock<() => Promise<void>>;
  wrap: jest.Mock<(value: unknown) => Promise<unknown>>;
  log: jest.Mock<(message: string) => Promise<string>>;
};

let originalCy: PropertyDescriptor | undefined;

const installCypressMock = (states: (string | null)[], terminateExitCode = 0): CypressMock => {
  const cyMock: CypressMock = {
    exec: jest.fn(async (command: string) => {
      if (command.includes('-X POST')) {
        return {
          exitCode: terminateExitCode,
          stdout: '',
          stderr: terminateExitCode === 0 ? '' : 'terminate failed',
        };
      }
      const state = states.shift() ?? null;
      return { exitCode: 0, stdout: JSON.stringify({ state }), stderr: '' };
    }),
    wait: jest.fn(async () => undefined),
    wrap: jest.fn((value: unknown) => Promise.resolve(value)),
    log: jest.fn(async (message: string) => message),
  };

  Object.defineProperty(globalThis, 'cy', {
    configurable: true,
    value: cyMock,
  });
  return cyMock;
};

describe('AutoML KFP run cleanup', () => {
  beforeEach(() => {
    originalCy = Object.getOwnPropertyDescriptor(globalThis, 'cy');
  });

  afterEach(() => {
    if (originalCy) {
      Object.defineProperty(globalThis, 'cy', originalCy);
    } else {
      Reflect.deleteProperty(globalThis, 'cy');
    }
  });

  it('does not terminate a run that is already terminal', async () => {
    const cyMock = installCypressMock(['SUCCEEDED']);

    await expect(settleAutomlRun('cy-e2e-automl-run-1', 'run-123')).resolves.toBe(true);
    expect(cyMock.exec).toHaveBeenCalledTimes(1);
    expect(cyMock.exec.mock.calls[0][0]).not.toContain('-X POST');
  });

  it('terminates an active run and waits until it reaches a terminal state', async () => {
    const cyMock = installCypressMock(['RUNNING', 'CANCELED']);

    await expect(settleAutomlRun('cy-e2e-automl-run-1', 'run-123')).resolves.toBe(true);
    expect(cyMock.exec.mock.calls.map(([command]) => command.includes('-X POST'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('does not claim an active run is settled when termination fails', async () => {
    const cyMock = installCypressMock(['RUNNING'], 1);

    await expect(settleAutomlRun('cy-e2e-automl-run-1', 'run-123')).resolves.toBe(false);
    expect(cyMock.exec).toHaveBeenCalledTimes(2);
    expect(cyMock.log).toHaveBeenCalledWith(
      'Could not terminate KFP run run-123 in cy-e2e-automl-run-1: terminate failed',
    );
  });

  it('returns false without terminating when the run state cannot be read', async () => {
    const cyMock = installCypressMock([null]);

    await expect(settleAutomlRun('cy-e2e-automl-run-1', 'run-123')).resolves.toBe(false);
    expect(cyMock.exec).toHaveBeenCalledTimes(1);
    expect(cyMock.exec.mock.calls[0][0]).not.toContain('-X POST');
  });

  it('returns false when a terminated run never reaches a terminal state', async () => {
    const cyMock = installCypressMock(Array.from({ length: 25 }, () => 'RUNNING'));

    await expect(settleAutomlRun('cy-e2e-automl-run-1', 'run-123')).resolves.toBe(false);
    expect(cyMock.wait).toHaveBeenCalledTimes(23);
  });
});
