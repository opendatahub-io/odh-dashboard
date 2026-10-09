import { describe, expect, it } from '@jest/globals';
import {
  createAwsCliPodTask,
  type AwsCliPodTaskOptions,
  type OcCommandRunner,
} from '../awsCliPodTask';
import type { CommandLineResult } from '../../cypress/types';

const taskOptions: AwsCliPodTaskOptions = {
  namespace: 'configured-cleanup',
  podName: 's3-cleanup-123',
  image: 'amazon/aws-cli:latest',
  region: 'us-east-1',
  awsAccessKeyId: 'access-key',
  awsSecretAccessKey: 'secret-key',
  awsCliArgs: ['s3', 'rm', 's3://bucket/prefix'],
  timeout: 1000,
};

const success: CommandLineResult = { exitCode: 0, stdout: '', stderr: '' };

describe('AWS CLI pod task', () => {
  it('creates the Secret, runs the pod, and deletes both resources in the configured namespace', async () => {
    const calls: { args: string[]; input?: string; timeout?: number }[] = [];
    const results = [success, success, success, success];
    const runCommand: OcCommandRunner = async (args, input, timeout) => {
      calls.push({ args, input, timeout });
      return results.shift() ?? success;
    };

    const result = await createAwsCliPodTask(runCommand)(taskOptions);

    expect(result.exitCode).toBe(0);
    expect(calls[0].args).toEqual(['apply', '-n', 'configured-cleanup', '-f', '-']);
    expect(JSON.parse(calls[0].input ?? '')).toMatchObject({
      metadata: { name: 's3-cleanup-123-creds', namespace: 'configured-cleanup' },
      stringData: {
        AWS_ACCESS_KEY_ID: 'access-key',
        AWS_SECRET_ACCESS_KEY: 'secret-key',
      },
    });
    const runArgs = calls[1].args;
    expect(runArgs.slice(0, 4)).toEqual(['run', 's3-cleanup-123', '-n', 'configured-cleanup']);
    const overrideArg = runArgs.find((arg) => arg.startsWith('--overrides='));
    expect(
      JSON.parse(overrideArg?.slice('--overrides='.length) ?? '{}').spec.activeDeadlineSeconds,
    ).toBe(121);
    expect(calls[2].args).toEqual([
      'delete',
      'pod',
      's3-cleanup-123',
      '-n',
      'configured-cleanup',
      '--wait=false',
      '--ignore-not-found',
    ]);
    expect(calls[3].args).toEqual([
      'delete',
      'secret',
      's3-cleanup-123-creds',
      '-n',
      'configured-cleanup',
      '--ignore-not-found',
    ]);
  });

  it('deletes the pod and Secret when the oc run subprocess times out', async () => {
    const calls: string[][] = [];
    const runCommand: OcCommandRunner = async (args) => {
      calls.push(args);
      if (args[0] === 'run') {
        throw new Error('oc command timed out after 1000ms');
      }
      return success;
    };

    const result = await createAwsCliPodTask(runCommand)(taskOptions);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('oc command timed out after 1000ms');
    expect(calls.map((args) => args[0])).toEqual(['apply', 'run', 'delete', 'delete']);
    expect(calls[2]).toContain('configured-cleanup');
    expect(calls[3]).toContain('configured-cleanup');
  });
});
