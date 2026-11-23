import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const CLEANUP_SCRIPT = path.join(PACKAGE_ROOT, 'scripts/cleanup-automl.ts');
const CLUSTER_SERVER = 'https://api.cluster.example.test:6443';
const PROJECT_NAMESPACE = 'cy-e2e-automl-run-1';
const EXECUTOR_NAMESPACE = 'stable-cleanup';
const TEMP_DIRS: string[] = [];

const fakeOcSource = String.raw`#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--context='));
const input = fs.readFileSync(0, 'utf8');
const logPath = process.env.OC_LOG;
const log = fs.existsSync(logPath)
  ? fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
  : [];
log.push({ args, input });
fs.writeFileSync(logPath, log.map((entry) => JSON.stringify(entry)).join('\n') + '\n');

const succeed = (value = '') => process.stdout.write(value, () => process.exit(0));
const fail = (message) => process.stderr.write(message, () => process.exit(1));
const project = {
  metadata: {
    name: process.env.OC_PROJECT_NAMESPACE,
    uid: process.env.OC_REUSE_PROJECT === '1' ? 'replacement-uid' : 'recorded-uid',
    labels: {
      'odh-dashboard.io/autox-cleanup-token': process.env.OC_REUSE_PROJECT === '1'
        ? 'replacement-token'
        : 'attempt-token',
    },
  },
  status: { phase: 'Active' },
};

function main() {
  if (args[0] === 'get' && args[1] === 'namespace') {
    const namespace = args[2];
    const response = namespace === process.env.OC_PROJECT_NAMESPACE
      ? project
      : { metadata: { name: namespace, uid: 'executor-uid' }, status: { phase: 'Active' } };
    return succeed(JSON.stringify(response));
  }
  if (args[0] === 'whoami' && args[1] === '--show-server') {
    return succeed(process.env.OC_CLUSTER_SERVER);
  }
  if (args[0] === 'get' && args[1] === 'secrets') {
    return succeed(process.env.OC_ORPHAN_SECRETS || '{"items":[]}');
  }
  if (args[0] === 'get' && args[1] === 'job') {
    const jobName = args[2];
    if (args.includes('--ignore-not-found')) {
      return succeed('');
    }
    const createdJob = log.find((entry) => {
      if (entry.args[0] !== 'create' || !entry.input) return false;
      try {
        return JSON.parse(entry.input).metadata.name === jobName;
      } catch {
        return false;
      }
    });
    if (!createdJob) return fail('job not found');
    const manifest = JSON.parse(createdJob.input);
    const getCount = log.filter(
      (entry) =>
        entry.args[0] === 'get' &&
        entry.args[1] === 'job' &&
        entry.args[2] === jobName &&
        !entry.args.includes('--ignore-not-found'),
    ).length;
    const response = {
      metadata: { uid: 'cleanup-job-uid', labels: manifest.metadata.labels },
      ...(getCount === 0 ? {} : { status: { conditions: [{ type: 'Complete', status: 'True' }] } }),
    };
    return succeed(JSON.stringify(response));
  }
  if (args[0] === 'create' && args[1] === '-f' && args[2] === '-') {
    const manifest = JSON.parse(input);
    if (manifest.kind === 'Job' && process.env.OC_FAIL_JOB_CREATE === '1') {
      return fail('injected Job creation failure');
    }
    return succeed('created');
  }
  if (args[0] === 'patch' && args[1] === 'secret' && process.env.OC_FAIL_SECRET_PATCH === '1') {
    return fail('injected Secret owner patch failure');
  }
  if (args[0] === 'patch' && args[1] === 'secret') return succeed('patched');
  if (args[0] === 'logs') return succeed('S3 cleanup completed');
  if (args[0] === 'describe') return succeed('');
  if (args[0] === 'delete') return succeed('deleted');
  return fail('unexpected oc command: ' + args.join(' '));
}
main();
`;

const makeProject = (overrides: Record<string, unknown> = {}) => ({
  namespace: PROJECT_NAMESPACE,
  bucketKey: 'BUCKET_2',
  bucketName: 'automl-test-bucket',
  clusterServer: CLUSTER_SERVER,
  s3Endpoint: 'https://provisioned-s3.example.test',
  cleanupToken: 'attempt-token',
  namespaceUID: 'recorded-uid',
  uploads: ['uploads/input.csv'],
  runs: [{ id: 'run-42', outputRoot: 'autogluon-tabular-training-pipeline' }],
  s3Cleaned: false,
  projectDeleted: true,
  errors: [],
  ...overrides,
});

const makeFixture = (
  project = makeProject(),
  options: {
    clusterServer?: string;
    reuseProject?: boolean;
    failJobCreate?: boolean;
    failSecretPatch?: boolean;
    dspaEndpoint?: string;
  } = {},
) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'automl-cleanup-cli-'));
  TEMP_DIRS.push(root);
  const manifestDirectory = path.join(root, 'manifests');
  const manifestPath = path.join(manifestDirectory, 'build', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({
      version: 1,
      spec: 'cypress/tests/automl.cy.ts',
      jobName: 'job-100',
      buildNumber: '100',
      createdAt: '2026-11-10T00:00:00.000Z',
      projects: [project],
    })}\n`,
  );

  const configPath = path.join(root, 'test-config.yml');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      S3: {
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        BUCKET_1: { NAME: '', REGION: '', ENDPOINT: '' },
        BUCKET_2: {
          NAME: 'automl-test-bucket',
          REGION: 'us-east-1',
          ENDPOINT: 'https://config-s3.example.test',
        },
        BUCKET_3: { NAME: '', REGION: '', ENDPOINT: '' },
      },
    }),
  );

  const binDirectory = path.join(root, 'bin');
  fs.mkdirSync(binDirectory);
  const ocPath = path.join(binDirectory, 'oc');
  fs.writeFileSync(ocPath, fakeOcSource, { mode: 0o755 });
  fs.chmodSync(ocPath, 0o755);
  const ocLog = path.join(root, 'oc-log.jsonl');
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${binDirectory}${path.delimiter}${process.env.PATH ?? ''}`,
    CY_TEST_CONFIG: configPath,
    OC_LOG: ocLog,
    OC_PROJECT_NAMESPACE: PROJECT_NAMESPACE,
    OC_CLUSTER_SERVER: options.clusterServer ?? CLUSTER_SERVER,
    CYPRESS_DSPA_S3_ENDPOINT: options.dspaEndpoint ?? 'https://provisioned-s3.example.test',
    ...(options.reuseProject ? { OC_REUSE_PROJECT: '1' } : {}),
    ...(options.failJobCreate ? { OC_FAIL_JOB_CREATE: '1' } : {}),
    ...(options.failSecretPatch ? { OC_FAIL_SECRET_PATCH: '1' } : {}),
  };

  return { root, manifestDirectory, manifestPath, environment, ocLog };
};

type CleanupResult = { status: number | null; stdout: string; stderr: string };

const runCleanup = (fixture: ReturnType<typeof makeFixture>, args: string[]): CleanupResult => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', CLEANUP_SCRIPT, ...args], {
    cwd: PACKAGE_ROOT,
    env: fixture.environment,
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

const applyArgs = (fixture: ReturnType<typeof makeFixture>): string[] => [
  '--apply',
  '--context=test-context',
  `--namespace=${EXECUTOR_NAMESPACE}`,
  `--manifest-dir=${fixture.manifestDirectory}`,
];

const readOcLog = (filePath: string): { args: string[]; input: string }[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { args: string[]; input: string });
};

const readManifest = (filePath: string): { projects: Record<string, unknown>[] } =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as { projects: Record<string, unknown>[] };

afterEach(() => {
  for (const directory of TEMP_DIRS.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('AutoML cleanup recovery CLI', () => {
  jest.setTimeout(30000);

  it('defaults to dry-run without contacting oc or changing the manifest', () => {
    const fixture = makeFixture();
    const result = runCleanup(fixture, [`--manifest-dir=${fixture.manifestDirectory}`]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Dry-run only');
    expect(result.stdout).toContain('S3 endpoint: https://provisioned-s3.example.test');
    expect(readOcLog(fixture.ocLog)).toHaveLength(0);
    expect(readManifest(fixture.manifestPath).projects[0]).toMatchObject({
      projectDeleted: true,
      s3Cleaned: false,
    });
  });

  it('refuses apply when the current cluster does not match the manifest', () => {
    const fixture = makeFixture(makeProject(), { clusterServer: 'https://other.cluster.test' });
    const result = runCleanup(fixture, applyArgs(fixture));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cluster mismatch');
    expect(
      readOcLog(fixture.ocLog).some(({ args }) => args[0] === 'create' || args[0] === 'delete'),
    ).toBe(false);
  });

  it('refuses a project name that has been reused with a different UID or token', () => {
    const fixture = makeFixture(makeProject({ projectDeleted: false }), { reuseProject: true });
    const result = runCleanup(fixture, applyArgs(fixture));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Namespace ownership mismatch');
    expect(
      readOcLog(fixture.ocLog).some(({ args }) => args[0] === 'create' || args[0] === 'delete'),
    ).toBe(false);
  });

  it('refuses an S3 endpoint that is not configured for the test bucket', () => {
    const fixture = makeFixture(makeProject(), {
      dspaEndpoint: 'https://different-s3.example.test',
    });
    const result = runCleanup(fixture, applyArgs(fixture));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not match the configured bucket endpoint');
    expect(
      readOcLog(fixture.ocLog).some(({ args }) => args[0] === 'create' || args[0] === 'delete'),
    ).toBe(false);
  });

  it('retries S3 cleanup after project deletion through the stable executor', () => {
    const fixture = makeFixture();
    const orphanRunId = '1234567890abcdef';
    fixture.environment.OC_ORPHAN_SECRETS = JSON.stringify({
      items: [
        {
          metadata: {
            name: `autox-s3-${orphanRunId}-creds`,
            labels: {
              'app.kubernetes.io/managed-by': 'odh-dashboard-cypress-cleanup',
              'odh-dashboard.io/automl-cleanup-run': orphanRunId,
            },
            creationTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        },
      ],
    });
    const result = runCleanup(fixture, applyArgs(fixture));

    expect(result.status).toBe(0);
    const commands = readOcLog(fixture.ocLog);
    const jobManifest = commands
      .filter(({ args, input }) => args[0] === 'create' && input)
      .map(
        ({ input }) =>
          JSON.parse(input) as {
            kind?: string;
            spec?: { template?: { spec?: { containers?: { args?: string[] }[] } } };
          },
      )
      .find((manifest) => manifest.kind === 'Job');
    expect(jobManifest).toBeDefined();
    const cleanupScript = jobManifest?.spec?.template?.spec?.containers?.[0]?.args?.[0];
    expect(cleanupScript).toContain("--endpoint-url 'https://provisioned-s3.example.test'");
    expect(cleanupScript).toContain("--key 'uploads/input.csv'");
    expect(cleanupScript).toContain("s3api delete-object --bucket 'automl-test-bucket'");
    expect(cleanupScript).toContain("s3api list-objects-v2 --bucket 'automl-test-bucket'");
    expect(cleanupScript).toContain(
      "s3 rm 's3://automl-test-bucket/autogluon-tabular-training-pipeline/run-42/' --recursive",
    );
    expect(cleanupScript).toContain(
      's3://automl-test-bucket/autogluon-tabular-training-pipeline/run-42/',
    );
    expect(
      commands.some(
        ({ args }) =>
          args[0] === 'delete' &&
          args[1] === 'secret' &&
          args[2] === `autox-s3-${orphanRunId}-creds`,
      ),
    ).toBe(true);
    expect(commands.some(({ args }) => args[0] === 'delete' && args[1] === 'job')).toBe(true);
    expect(
      commands.some(
        ({ args }) =>
          args[0] === 'delete' &&
          args[1] === 'secret' &&
          args[2]?.includes('autox-s3-') &&
          args[2] !== `autox-s3-${orphanRunId}-creds`,
      ),
    ).toBe(true);
    expect(readManifest(fixture.manifestPath).projects[0]).toMatchObject({
      projectDeleted: true,
      s3Cleaned: true,
      errors: [],
    });
  });

  it('records a failed Job creation and still attempts credential cleanup', () => {
    const fixture = makeFixture(makeProject(), { failJobCreate: true });
    const result = runCleanup(fixture, applyArgs(fixture));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('injected Job creation failure');
    const commands = readOcLog(fixture.ocLog);
    expect(commands.some(({ args }) => args[0] === 'delete' && args[1] === 'job')).toBe(true);
    expect(commands.some(({ args }) => args[0] === 'delete' && args[1] === 'secret')).toBe(true);
    expect(readManifest(fixture.manifestPath).projects[0]).toMatchObject({
      s3Cleaned: false,
      projectDeleted: true,
    });
  });

  it('deletes the recovery Job and credential Secret if attaching the Secret owner fails', () => {
    const fixture = makeFixture(makeProject(), { failSecretPatch: true });
    const result = runCleanup(fixture, [
      '--apply',
      '--context=test-context',
      `--namespace=${EXECUTOR_NAMESPACE}`,
      `--manifest-dir=${fixture.manifestDirectory}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('injected Secret owner patch failure');
    const commands = readOcLog(fixture.ocLog);
    expect(commands.some(({ args }) => args[0] === 'patch' && args[1] === 'secret')).toBe(true);
    expect(commands.some(({ args }) => args[0] === 'delete' && args[1] === 'job')).toBe(true);
    expect(commands.some(({ args }) => args[0] === 'delete' && args[1] === 'secret')).toBe(true);
    expect(readManifest(fixture.manifestPath).projects[0]).toMatchObject({
      s3Cleaned: false,
      projectDeleted: true,
    });
  });
});
