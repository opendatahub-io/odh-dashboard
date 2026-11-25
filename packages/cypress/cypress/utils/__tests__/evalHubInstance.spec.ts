import { spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import type * as EvalHubInstance from '../oc_commands/evalHubInstance';

let cleanupEvalHubMlflowExperiment: typeof EvalHubInstance.cleanupEvalHubMlflowExperiment;

const execResult = (stdout = '', exitCode = 0, stderr = ''): Cypress.Exec =>
  ({ stdout, exitCode, stderr } as Cypress.Exec);

const httpResponse = (body: string, status = 200): Cypress.Exec =>
  execResult(`${body}\nEVALHUB_MLFLOW_HTTP_STATUS:${status}`);

const experimentResponse = (lifecycleStage: string, experimentId = '24'): Cypress.Exec =>
  httpResponse(
    JSON.stringify({
      experiment: {
        experiment_id: experimentId, // eslint-disable-line camelcase -- MLflow API field
        lifecycle_stage: lifecycleStage, // eslint-disable-line camelcase -- MLflow API field
      },
    }),
  );

const setupCypress = (responses: Cypress.Exec[]) => {
  const pending = [...responses];
  const commands = {
    exec: jest.fn((command: string) => {
      const result = pending.shift();
      if (!result) {
        throw new Error(`Unexpected MLflow command: ${command}`);
      }
      return Promise.resolve(result);
    }),
    wrap: jest.fn((value: unknown) => Promise.resolve(value)),
    wait: jest.fn(() => Promise.resolve()),
    log: jest.fn(),
  };
  Object.assign(globalThis, {
    cy: commands,
    Cypress: {
      env: jest.fn((key: string) =>
        key === 'APPLICATIONS_NAMESPACE' ? 'redhat-ods-applications' : undefined,
      ),
    },
  });
  return commands;
};

beforeAll(() => {
  setupCypress([]);
  ({ cleanupEvalHubMlflowExperiment } = jest.requireActual<typeof EvalHubInstance>(
    '../oc_commands/evalHubInstance',
  ));
});

describe('cleanupEvalHubMlflowExperiment', () => {
  it('should retry a timed-out lookup and verify deletion by the original ID', async () => {
    const commands = setupCypress([
      execResult('', 124, 'stalled oc exec'),
      experimentResponse('active'),
      httpResponse('{}'),
      experimentResponse('deleted'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(true);

    expect(commands.exec).toHaveBeenCalledTimes(4);
    expect(commands.wait).toHaveBeenCalledTimes(1);
    expect(commands.exec.mock.calls[0][0]).toContain('timeout_command=$(command -v timeout');
    expect(commands.exec.mock.calls[2][0]).toContain('experiments/delete');
    expect(commands.exec.mock.calls[3][0]).toContain('experiments/get?experiment_id=24');
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('should report a lookup timeout after three attempts without deleting', async () => {
    const commands = setupCypress([execResult('', 124), execResult('', 124), execResult('', 124)]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(false);

    expect(commands.exec).toHaveBeenCalledTimes(3);
    expect(commands.wait).toHaveBeenCalledTimes(2);
    expect(reportFailure).toHaveBeenCalledWith(
      expect.stringContaining('timed out after 45 seconds'),
    );
    expect(
      commands.exec.mock.calls.every(([command]) => !command.includes('experiments/delete')),
    ).toBe(true);
  });

  it('should fail promptly when no timeout utility is available', async () => {
    const commands = setupCypress([
      execResult('', 127, 'MLflow cleanup requires timeout or gtimeout; command not run'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(false);

    expect(commands.exec).toHaveBeenCalledTimes(1);
    expect(commands.wait).not.toHaveBeenCalled();
    const fallback = spawnSync('/bin/sh', ['-c', commands.exec.mock.calls[0][0]], {
      env: { PATH: '/nonexistent' },
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(fallback.status).toBe(127);
    expect(fallback.stderr).toContain('MLflow cleanup requires timeout or gtimeout');
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('command not run'));
  });

  it('should check the original experiment before replaying an ambiguous delete', async () => {
    const commands = setupCypress([
      experimentResponse('active'),
      httpResponse('{"error_code":"UNAVAILABLE"}', 503),
      experimentResponse('active'),
      httpResponse('{}'),
      experimentResponse('deleted'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(true);

    expect(
      commands.exec.mock.calls.map(([command]) =>
        command.includes('experiments/delete')
          ? 'delete'
          : command.includes('experiments/get?experiment_id=24')
          ? 'get original ID'
          : 'get by name',
      ),
    ).toEqual(['get by name', 'delete', 'get original ID', 'delete', 'get original ID']);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('should accept a committed delete with a malformed successful response after an ID check', async () => {
    const commands = setupCypress([
      experimentResponse('active'),
      httpResponse('null'),
      experimentResponse('deleted'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(true);

    expect(commands.exec).toHaveBeenCalledTimes(3);
    expect(commands.exec.mock.calls[2][0]).toContain('experiments/get?experiment_id=24');
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('should stop replaying a failing delete after three ID checks', async () => {
    const commands = setupCypress([
      experimentResponse('active'),
      httpResponse('{"error_code":"UNAVAILABLE"}', 503),
      experimentResponse('active'),
      httpResponse('{"error_code":"UNAVAILABLE"}', 503),
      experimentResponse('active'),
      httpResponse('{"error_code":"UNAVAILABLE"}', 503),
      experimentResponse('active'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(false);

    expect(commands.exec).toHaveBeenCalledTimes(7);
    expect(
      commands.exec.mock.calls.filter(([command]) => command.includes('experiments/delete')),
    ).toHaveLength(3);
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('failed after 3 attempts'));
  });

  it('should stop an ambiguous delete when the ID lookup returns a different experiment', async () => {
    const commands = setupCypress([
      experimentResponse('active'),
      httpResponse('{"error_code":"UNAVAILABLE"}', 503),
      experimentResponse('active', '25'),
    ]);
    const reportFailure = jest.fn<(message: string) => void>();

    await expect(
      cleanupEvalHubMlflowExperiment('tenant-1', 'experiment-1', reportFailure),
    ).resolves.toBe(false);

    expect(commands.exec).toHaveBeenCalledTimes(3);
    expect(reportFailure).toHaveBeenCalledWith(expect.stringContaining('different experiment ID'));
  });
});
