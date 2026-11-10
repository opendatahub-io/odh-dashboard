import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { randomBytes } from 'crypto';
import {
  AUTOML_RECOVERY_MANAGED_BY,
  AUTOML_RECOVERY_MANAGED_BY_LABEL,
  AUTOML_RECOVERY_RUN_ID_LABEL,
  buildRecoveryJobManifest,
  buildRecoverySecretManifest,
  buildRecoverySecretOwnerReference,
} from './automlCleanupRecovery';
import type { CommandLineResult } from '../cypress/types';

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const OC_CLEANUP_TIMEOUT_MS = 30000;
const MAX_OUTPUT_LENGTH = 4 * 1024 * 1024;
export type AwsCliPodTaskOptions = {
  namespace: string;
  podName: string;
  image: string;
  region: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsCaBundle?: string;
  awsCliArgs: string[];
  command?: string[];
  timeout: number;
};

export type OcCommandRunner = (
  args: string[],
  input?: string,
  timeout?: number,
) => Promise<CommandLineResult>;

const appendOutput = (current: string, chunk: Buffer): string =>
  current.length >= MAX_OUTPUT_LENGTH
    ? current
    : current + chunk.toString().slice(0, MAX_OUTPUT_LENGTH - current.length);

const runOc: OcCommandRunner = (args, input, timeout = OC_CLEANUP_TIMEOUT_MS) =>
  new Promise((resolve) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn('oc', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let processError = '';
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    }, timeout);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.stdin.on('error', () => undefined);
    child.on('error', (error) => {
      processError = error.message;
    });
    child.on('close', (code) => {
      clearTimeout(timeoutTimer);
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolve({
        exitCode: timedOut ? 124 : code ?? 1,
        stdout,
        stderr: [stderr, processError, timedOut ? `oc command timed out after ${timeout}ms` : '']
          .filter(Boolean)
          .join('\n'),
      });
    });

    child.stdin.end(input);
  });

const assertDnsLabel = (kind: string, value: string): void => {
  if (!DNS_LABEL.test(value) || value.length > 63) {
    throw new Error(`Invalid ${kind} for AWS CLI pod task`);
  }
};

const commandFailure = (error: unknown): CommandLineResult => ({
  exitCode: 1,
  stdout: '',
  stderr: error instanceof Error ? error.message : String(error),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getJobState = (job: Record<string, unknown>): 'complete' | 'failed' | 'running' => {
  const status = isRecord(job.status) ? job.status : {};
  const conditions = Array.isArray(status.conditions) ? status.conditions : [];
  const hasCondition = (type: 'Complete' | 'Failed'): boolean =>
    conditions.some(
      (condition) => isRecord(condition) && condition.type === type && condition.status === 'True',
    );
  if (hasCondition('Complete')) {
    return 'complete';
  }
  if (hasCondition('Failed') || (typeof status.failed === 'number' && status.failed > 0)) {
    return 'failed';
  }
  return 'running';
};

export const createAwsCliPodTask =
  (runCommand: OcCommandRunner = runOc) =>
  async (options: AwsCliPodTaskOptions): Promise<CommandLineResult> => {
    const {
      namespace,
      podName,
      image,
      region,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsCaBundle,
      awsCliArgs,
      command,
      timeout,
    } = options;
    assertDnsLabel('namespace', namespace);
    assertDnsLabel('pod name', podName);
    const runId = randomBytes(8).toString('hex');
    const jobName = `autox-s3-${runId}`;
    const secretName = `autox-s3-${runId}-creds`;
    assertDnsLabel('job name', jobName);
    assertDnsLabel('secret name', secretName);
    if (!Number.isFinite(timeout) || timeout < 1) {
      throw new Error('Invalid AWS CLI pod task timeout');
    }

    const secretManifest = JSON.stringify(
      buildRecoverySecretManifest(namespace, secretName, runId, {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        region,
        caBundle: awsCaBundle,
      }),
    );
    const jobManifest = JSON.stringify(
      buildRecoveryJobManifest({
        namespace,
        jobName,
        secretName,
        image,
        containerName: podName,
        command,
        args: awsCliArgs,
        timeoutMs: timeout,
        caBundle: awsCaBundle,
      }),
    );

    let result: CommandLineResult = { exitCode: 1, stdout: '', stderr: '' };
    const cleanupErrors: string[] = [];
    try {
      result = await runCommand(
        ['create', '-n', namespace, '-f', '-'],
        secretManifest,
        OC_CLEANUP_TIMEOUT_MS,
      );
      if (result.exitCode === 0) {
        const jobResult = await runCommand(
          ['create', '-n', namespace, '-f', '-'],
          jobManifest,
          OC_CLEANUP_TIMEOUT_MS,
        );
        if (jobResult.exitCode !== 0) {
          result = {
            ...jobResult,
            stderr: `Could not create AWS CLI Job ${jobName}: ${jobResult.stderr}`,
          };
        } else {
          const deadline = Date.now() + timeout;
          const readJob = async (): Promise<{
            response: Record<string, unknown>;
            uid: string;
          }> => {
            const jobInfo = await runCommand(
              ['get', 'job', jobName, '-n', namespace, '-o', 'json'],
              undefined,
              OC_CLEANUP_TIMEOUT_MS,
            );
            if (jobInfo.exitCode !== 0) {
              throw new Error(`Could not inspect AWS CLI Job ${jobName}: ${jobInfo.stderr}`);
            }
            let response: unknown;
            try {
              response = JSON.parse(jobInfo.stdout);
            } catch {
              throw new Error(`Invalid AWS CLI Job response for ${jobName}`);
            }
            if (!isRecord(response) || !isRecord(response.metadata)) {
              throw new Error(`Invalid AWS CLI Job response for ${jobName}`);
            }
            const { metadata } = response;
            const labels = isRecord(metadata.labels) ? metadata.labels : {};
            if (
              typeof metadata.uid !== 'string' ||
              labels[AUTOML_RECOVERY_MANAGED_BY_LABEL] !== AUTOML_RECOVERY_MANAGED_BY ||
              labels[AUTOML_RECOVERY_RUN_ID_LABEL] !== runId
            ) {
              throw new Error(`AWS CLI Job ${jobName} does not match this task`);
            }
            return { response, uid: metadata.uid };
          };

          const { response: jobInfo, uid: jobUID } = await readJob();
          const ownerPatch = await runCommand(
            [
              'patch',
              'secret',
              secretName,
              '-n',
              namespace,
              '--type=merge',
              '-p',
              JSON.stringify({
                metadata: {
                  ownerReferences: [buildRecoverySecretOwnerReference(jobName, jobUID)],
                },
              }),
            ],
            undefined,
            OC_CLEANUP_TIMEOUT_MS,
          );
          if (ownerPatch.exitCode !== 0) {
            result = {
              ...ownerPatch,
              stderr: `Could not attach credential Secret to AWS CLI Job ${jobName}: ${ownerPatch.stderr}`,
            };
          } else {
            let state = getJobState(jobInfo);
            while (state === 'running' && Date.now() < deadline) {
              await new Promise<void>((resolve) => {
                setTimeout(resolve, Math.min(1000, Math.max(0, deadline - Date.now())));
              });
              if (Date.now() < deadline) {
                const currentJob = await readJob();
                state = getJobState(currentJob.response);
              }
            }

            const timedOut = state === 'running';
            const logs = await runCommand(
              ['logs', `job/${jobName}`, '-n', namespace],
              undefined,
              OC_CLEANUP_TIMEOUT_MS,
            );
            if (!timedOut && state === 'complete' && logs.exitCode === 0) {
              result = logs;
            } else {
              const describe = await runCommand(
                ['describe', 'job', jobName, '-n', namespace],
                undefined,
                OC_CLEANUP_TIMEOUT_MS,
              );
              result = {
                exitCode: timedOut ? 124 : 1,
                stdout: logs.stdout,
                stderr: [
                  timedOut ? `AWS CLI Job timed out after ${timeout}ms` : 'AWS CLI Job failed',
                  logs.stderr,
                  logs.stdout,
                  describe.stdout,
                  describe.stderr,
                ]
                  .filter(Boolean)
                  .join('\n'),
              };
            }
          }
        }
      }
    } catch (error) {
      result = commandFailure(error);
    } finally {
      const cleanupCommands: [string, string[]][] = [
        ['Job', ['delete', 'job', jobName, '-n', namespace, '--wait=false', '--ignore-not-found']],
        [
          'credential Secret',
          ['delete', 'secret', secretName, '-n', namespace, '--ignore-not-found'],
        ],
      ];
      for (const [resource, args] of cleanupCommands) {
        try {
          const cleanupResult = await runCommand(args, undefined, OC_CLEANUP_TIMEOUT_MS);
          if (cleanupResult.exitCode !== 0) {
            cleanupErrors.push(`Could not delete AWS CLI ${resource}: ${cleanupResult.stderr}`);
          }
        } catch (error) {
          cleanupErrors.push(`Could not delete AWS CLI ${resource}: ${String(error)}`);
        }
      }
      if (cleanupErrors.length > 0) {
        result = {
          ...result,
          exitCode: result.exitCode || 1,
          stderr: [result.stderr, ...cleanupErrors].filter(Boolean).join('\n'),
        };
      }
    }

    return result;
  };
