import { describe, expect, it } from '@jest/globals';
import {
  createAwsCliPodTask,
  type AwsCliPodTaskOptions,
  type OcCommandRunner,
} from '../awsCliPodTask';
import type { CommandLineResult } from '../../cypress/types';
import {
  AUTOML_RECOVERY_JOB_TTL_SECONDS,
  AUTOML_RECOVERY_ORPHAN_AGE_MS,
  AUTOML_RECOVERY_MANAGED_BY,
  AUTOML_RECOVERY_RUN_ID_LABEL,
  isStaleUnownedRecoverySecret,
} from '../automlCleanupRecovery';

const taskOptions: AwsCliPodTaskOptions = {
  namespace: 'configured-cleanup',
  podName: 's3-cleanup-123',
  image: 'amazon/aws-cli:latest',
  region: 'us-east-1',
  awsAccessKeyId: 'access-key',
  awsSecretAccessKey: 'secret-key',
  awsCaBundle: 'ca-bundle',
  awsCliArgs: ['s3', 'rm', 's3://bucket/prefix'],
  timeout: 1000,
};

const success: CommandLineResult = { exitCode: 0, stdout: '', stderr: '' };

type JobStatusResponse = {
  metadata: { uid: string; labels: Record<string, string> };
  status?: { conditions: { type: string; status: string }[] };
};

const getCreatedJob = (calls: { args: string[]; input?: string }[]): Record<string, unknown> => {
  const call = calls.find(
    ({ args, input }) => args[0] === 'create' && input && JSON.parse(input).kind === 'Job',
  );
  if (!call?.input) {
    throw new Error('AWS CLI Job was not created');
  }
  return JSON.parse(call.input) as Record<string, unknown>;
};

const jobStatus = (
  job: Record<string, unknown>,
  state: 'Complete' | 'Failed' | null,
): JobStatusResponse => {
  const metadata = job.metadata as { labels: Record<string, string> };
  return {
    metadata: { uid: 'job-uid-123', labels: metadata.labels },
    ...(state ? { status: { conditions: [{ type: state, status: 'True' }] } } : {}),
  };
};

describe('AWS CLI Job task', () => {
  it('runs a TTL-managed Job, owns the credential Secret, and cleans up both resources', async () => {
    const calls: { args: string[]; input?: string; timeout?: number }[] = [];
    const runCommand: OcCommandRunner = async (args, input, timeout) => {
      calls.push({ args, input, timeout });
      if (args[0] === 'get' && args[1] === 'job') {
        return {
          exitCode: 0,
          stdout: JSON.stringify(jobStatus(getCreatedJob(calls), 'Complete')),
          stderr: '',
        };
      }
      if (args[0] === 'logs') {
        return { exitCode: 0, stdout: 'aws command output', stderr: '' };
      }
      return success;
    };

    const result = await createAwsCliPodTask(runCommand)(taskOptions);

    expect(result).toEqual({ exitCode: 0, stdout: 'aws command output', stderr: '' });
    expect(calls.map(({ args }) => args[0])).toEqual([
      'create',
      'create',
      'get',
      'patch',
      'logs',
      'delete',
      'delete',
    ]);
    const secret = JSON.parse(calls[0].input ?? '') as {
      metadata: { name: string; labels: Record<string, string> };
      stringData: Record<string, string>;
    };
    const runId = secret.metadata.name.slice(
      'autox-s3-'.length,
      secret.metadata.name.length - '-creds'.length,
    );
    expect(calls[0].args).toEqual(['create', '-n', 'configured-cleanup', '-f', '-']);
    expect(secret.metadata.name).toMatch(/^autox-s3-[a-f0-9]{16}-creds$/);
    expect(secret.metadata.labels).toMatchObject({
      'app.kubernetes.io/managed-by': AUTOML_RECOVERY_MANAGED_BY,
      [AUTOML_RECOVERY_RUN_ID_LABEL]: runId,
    });
    expect(secret.stringData).toEqual({
      AWS_ACCESS_KEY_ID: 'access-key',
      AWS_SECRET_ACCESS_KEY: 'secret-key',
      AWS_DEFAULT_REGION: 'us-east-1',
      AWS_CA_BUNDLE_PEM: 'ca-bundle',
    });
    expect(
      isStaleUnownedRecoverySecret({
        metadata: {
          ...secret.metadata,
          creationTimestamp: new Date(
            Date.now() - AUTOML_RECOVERY_ORPHAN_AGE_MS - 1000,
          ).toISOString(),
        },
      }),
    ).toBe(true);

    const job = getCreatedJob(calls);
    const jobName = (job.metadata as { name: string }).name;
    expect(job).toMatchObject({
      kind: 'Job',
      metadata: {
        name: secret.metadata.name.slice(0, -'-creds'.length),
        namespace: 'configured-cleanup',
        labels: {
          'app.kubernetes.io/managed-by': AUTOML_RECOVERY_MANAGED_BY,
          [AUTOML_RECOVERY_RUN_ID_LABEL]: secret.metadata.labels[AUTOML_RECOVERY_RUN_ID_LABEL],
        },
      },
      spec: {
        ttlSecondsAfterFinished: AUTOML_RECOVERY_JOB_TTL_SECONDS,
        activeDeadlineSeconds: 121,
        backoffLimit: 0,
        template: {
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: 's3-cleanup-123',
                image: 'amazon/aws-cli:latest',
                args: ['s3', 'rm', 's3://bucket/prefix'],
                envFrom: [{ secretRef: { name: secret.metadata.name } }],
                env: [{ name: 'AWS_CA_BUNDLE', value: '/tmp/s3-ca/ca.pem' }],
                volumeMounts: [{ name: 's3-ca', mountPath: '/tmp/s3-ca', readOnly: true }],
              },
            ],
            volumes: [
              {
                name: 's3-ca',
                secret: {
                  secretName: secret.metadata.name,
                  items: [{ key: 'AWS_CA_BUNDLE_PEM', path: 'ca.pem' }],
                },
              },
            ],
          },
        },
      },
    });

    const ownerPatch = calls.find(({ args }) => args[0] === 'patch');
    const ownerPatchBody = JSON.parse(ownerPatch?.args.at(-1) ?? '{}') as {
      metadata: { ownerReferences: { name: string; uid: string }[] };
    };
    expect(ownerPatchBody.metadata.ownerReferences).toEqual([
      expect.objectContaining({
        kind: 'Job',
        name: jobName,
        uid: 'job-uid-123',
        controller: true,
      }),
    ]);
    expect(calls.at(-2)?.args).toEqual([
      'delete',
      'job',
      jobName,
      '-n',
      'configured-cleanup',
      '--wait=false',
      '--ignore-not-found',
    ]);
    expect(calls.at(-1)?.args).toEqual([
      'delete',
      'secret',
      secret.metadata.name,
      '-n',
      'configured-cleanup',
      '--ignore-not-found',
    ]);
  });

  it('returns a timeout exit code and removes the Job and Secret', async () => {
    const calls: { args: string[]; input?: string }[] = [];
    const runCommand: OcCommandRunner = async (args, input) => {
      calls.push({ args, input });
      if (args[0] === 'get' && args[1] === 'job') {
        return {
          exitCode: 0,
          stdout: JSON.stringify(jobStatus(getCreatedJob(calls), null)),
          stderr: '',
        };
      }
      return success;
    };

    const result = await createAwsCliPodTask(runCommand)({ ...taskOptions, timeout: 1 });

    expect(result.exitCode).toBe(124);
    expect(result.stderr).toContain('timed out after 1ms');
    const commandNames = calls.map(({ args }) => args[0]);
    expect(commandNames.slice(0, 4)).toEqual(['create', 'create', 'get', 'patch']);
    expect(commandNames.slice(4, -4).every((command) => command === 'get')).toBe(true);
    expect(commandNames.slice(4, -4).length).toBeLessThanOrEqual(1);
    expect(commandNames.slice(-4)).toEqual(['logs', 'describe', 'delete', 'delete']);
    expect(calls.at(-2)?.args[1]).toBe('job');
    expect(calls.at(-1)?.args[1]).toBe('secret');
  });

  it('cleans up the credential Secret if Job creation fails', async () => {
    const calls: { args: string[]; input?: string }[] = [];
    const runCommand: OcCommandRunner = async (args, input) => {
      calls.push({ args, input });
      if (args[0] === 'create' && input && JSON.parse(input).kind === 'Job') {
        return { exitCode: 1, stdout: '', stderr: 'Job creation rejected' };
      }
      return success;
    };

    const result = await createAwsCliPodTask(runCommand)(taskOptions);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Could not create AWS CLI Job');
    expect(calls.map(({ args }) => args[0])).toEqual(['create', 'create', 'delete', 'delete']);
    expect(calls.at(-2)?.args[1]).toBe('job');
    expect(calls.at(-1)?.args[1]).toBe('secret');
  });

  it('deletes the Job and Secret if attaching the Secret owner fails', async () => {
    const calls: { args: string[]; input?: string }[] = [];
    const runCommand: OcCommandRunner = async (args, input) => {
      calls.push({ args, input });
      if (args[0] === 'get' && args[1] === 'job') {
        return {
          exitCode: 0,
          stdout: JSON.stringify(jobStatus(getCreatedJob(calls), 'Complete')),
          stderr: '',
        };
      }
      if (args[0] === 'patch') {
        return { exitCode: 1, stdout: '', stderr: 'owner patch rejected' };
      }
      return success;
    };

    const result = await createAwsCliPodTask(runCommand)(taskOptions);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Could not attach credential Secret');
    expect(calls.map(({ args }) => args[0])).toEqual([
      'create',
      'create',
      'get',
      'patch',
      'delete',
      'delete',
    ]);
    expect(calls.at(-2)?.args[1]).toBe('job');
    expect(calls.at(-1)?.args[1]).toBe('secret');
  });
});
