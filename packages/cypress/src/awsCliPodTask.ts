import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import type { CommandLineResult } from '../cypress/types';

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const OC_CLEANUP_TIMEOUT_MS = 30000;
const MAX_OUTPUT_LENGTH = 4 * 1024 * 1024;
export const AWS_CLI_TASK_CLEANUP_HEADROOM_MS = 180000;

export type AwsCliPodTaskOptions = {
  namespace: string;
  podName: string;
  image: string;
  region: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
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
      awsCliArgs,
      command,
      timeout,
    } = options;
    assertDnsLabel('namespace', namespace);
    assertDnsLabel('pod name', podName);
    const secretName = `${podName}-creds`;
    assertDnsLabel('secret name', secretName);
    if (!Number.isFinite(timeout) || timeout < 1) {
      throw new Error('Invalid AWS CLI pod task timeout');
    }

    const secretManifest = JSON.stringify({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: secretName, namespace },
      stringData: {
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_DEFAULT_REGION: region,
      },
    });
    // Keep a server-side backstop in case the Cypress Node process exits before cleanup finishes.
    const activeDeadlineSeconds = Math.ceil(timeout / 1000) + 120;
    const podOverrides = JSON.stringify({
      spec: {
        activeDeadlineSeconds,
        containers: [
          {
            name: podName,
            image,
            ...(command ? { command } : {}),
            args: awsCliArgs,
            envFrom: [{ secretRef: { name: secretName } }],
            securityContext: {
              runAsUser: 1001,
              runAsGroup: 1001,
              runAsNonRoot: true,
              allowPrivilegeEscalation: false,
              seccompProfile: { type: 'RuntimeDefault' },
              capabilities: { drop: ['ALL'] },
            },
          },
        ],
      },
    });

    let result: CommandLineResult = { exitCode: 1, stdout: '', stderr: '' };
    const cleanupErrors: string[] = [];
    try {
      result = await runCommand(
        ['apply', '-n', namespace, '-f', '-'],
        secretManifest,
        OC_CLEANUP_TIMEOUT_MS,
      );
      if (result.exitCode === 0) {
        result = await runCommand(
          [
            'run',
            podName,
            '-n',
            namespace,
            `--image=${image}`,
            '--restart=Never',
            '--attach',
            '--tty=false',
            '--pod-running-timeout=300s',
            `--overrides=${podOverrides}`,
          ],
          undefined,
          timeout,
        );
        if (result.exitCode !== 0) {
          try {
            const description = await runCommand(
              ['describe', 'pod', podName, '-n', namespace],
              undefined,
              OC_CLEANUP_TIMEOUT_MS,
            );
            result.stderr = [result.stderr, description.stdout || description.stderr]
              .filter(Boolean)
              .join('\n');
          } catch (error) {
            result.stderr = [result.stderr, `Could not describe AWS CLI pod: ${String(error)}`]
              .filter(Boolean)
              .join('\n');
          }
        }
      }
    } catch (error) {
      result = commandFailure(error);
    } finally {
      const cleanupCommands: [string, string[]][] = [
        ['pod', ['delete', 'pod', podName, '-n', namespace, '--wait=false', '--ignore-not-found']],
        [
          'credential Secret',
          ['delete', 'secret', secretName, '-n', namespace, '--ignore-not-found'],
        ],
      ];
      for (const [resource, args] of cleanupCommands) {
        try {
          const cleanupResult = await runCommand(args, undefined, OC_CLEANUP_TIMEOUT_MS);
          if (cleanupResult.exitCode !== 0) {
            cleanupErrors.push(
              `Could not delete AWS CLI ${resource} ${resource === 'pod' ? podName : secretName}: ${
                cleanupResult.stderr
              }`,
            );
          }
        } catch (error) {
          cleanupErrors.push(
            `Could not delete AWS CLI ${resource} ${
              resource === 'pod' ? podName : secretName
            }: ${String(error)}`,
          );
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
