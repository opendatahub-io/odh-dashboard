import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import {
  assertAutomlCleanupProject,
  buildAutomlS3CleanupScript,
  DEFAULT_AWS_CLI_IMAGE,
} from '../src/automlCleanupCommands';
import {
  readAutomlCleanupManifest,
  writeAutomlCleanupManifest,
  type AutomlCleanupManifest,
  type AutomlCleanupProject,
} from '../src/automlCleanupManifest';
import type { AWSS3Buckets } from '../cypress/types';

type CliOptions = {
  apply: boolean;
  directory: string;
  executorNamespace: string;
  context: string;
  image: string;
};

type CommandResult = { exitCode: number; stdout: string; stderr: string };

const NAMESPACE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED', 'CACHED']);
const TERMINATABLE_STATES = new Set(['PENDING', 'RUNNING', 'PAUSED']);
const S3_CLEANUP_TIMEOUT_MS = 900000;
const CLEANUP_POD_HEADROOM_SECONDS = 120;
let cleanupOcContext = '';

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const optionValue = (name: string): string | undefined =>
    args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: node --import tsx scripts/cleanup-automl.ts [--apply] [--context=OC_CONTEXT] [--namespace=PROJECT] [--manifest-dir=DIR]\n' +
        'Dry-run is the default. --apply requires an explicit oc context, stable executor namespace, and CY_TEST_CONFIG.\n',
    );
    process.exit(0);
  }
  const unknown = args.filter(
    (arg) =>
      arg !== '--apply' &&
      !arg.startsWith('--context=') &&
      !arg.startsWith('--namespace=') &&
      !arg.startsWith('--manifest-dir='),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown arguments: ${unknown.join(', ')}`);
  }
  return {
    apply: args.includes('--apply'),
    directory: path.resolve(optionValue('--manifest-dir') ?? 'results/e2e/automl-cleanup'),
    executorNamespace: optionValue('--namespace') ?? process.env.CY_AUTOML_CLEANUP_NAMESPACE ?? '',
    context: optionValue('--context') ?? process.env.CY_AUTOML_CLEANUP_CONTEXT ?? '',
    image: process.env.CY_S3_CLEANUP_IMAGE || DEFAULT_AWS_CLI_IMAGE,
  };
};

const listManifestPaths = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listManifestPaths(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
};

const runOc = (args: string[], input?: string, timeout = 30000): CommandResult => {
  const result = spawnSync(
    'oc',
    [...(cleanupOcContext ? [`--context=${cleanupOcContext}`] : []), ...args],
    {
      input,
      encoding: 'utf8',
      timeout,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.error?.message ?? result.stderr,
  };
};

const namespaceStatus = (
  namespace: string,
): { exists: boolean; finalizers: string[]; phase: string | null } => {
  const result = runOc(['get', 'namespace', namespace, '-o', 'json', '--ignore-not-found']);
  if (result.exitCode !== 0) {
    throw new Error(`Could not inspect namespace ${namespace}: ${result.stderr}`);
  }
  if (!result.stdout.trim()) {
    return { exists: false, finalizers: [], phase: null };
  }
  const response: unknown = JSON.parse(result.stdout);
  if (
    typeof response !== 'object' ||
    response === null ||
    !('metadata' in response) ||
    typeof response.metadata !== 'object' ||
    response.metadata === null
  ) {
    throw new Error(`Invalid namespace response for ${namespace}`);
  }
  const finalizers =
    'finalizers' in response.metadata && Array.isArray(response.metadata.finalizers)
      ? response.metadata.finalizers.filter(
          (item: unknown): item is string => typeof item === 'string',
        )
      : [];
  if (
    'spec' in response &&
    typeof response.spec === 'object' &&
    response.spec !== null &&
    'finalizers' in response.spec &&
    Array.isArray(response.spec.finalizers)
  ) {
    finalizers.push(
      ...response.spec.finalizers.filter(
        (item: unknown): item is string => typeof item === 'string',
      ),
    );
  }
  const phase =
    'status' in response &&
    typeof response.status === 'object' &&
    response.status !== null &&
    'phase' in response.status &&
    typeof response.status.phase === 'string'
      ? response.status.phase
      : null;
  return { exists: true, finalizers, phase };
};

const namespacePodCount = (namespace: string): number => {
  const result = runOc(['get', 'pods', '-n', namespace, '-o', 'json']);
  if (result.exitCode !== 0) {
    throw new Error(`Could not list pods in namespace ${namespace}: ${result.stderr}`);
  }
  const response: unknown = JSON.parse(result.stdout);
  if (
    typeof response !== 'object' ||
    response === null ||
    !('items' in response) ||
    !Array.isArray(response.items)
  ) {
    throw new Error(`Invalid pod list response for namespace ${namespace}`);
  }
  return response.items.length;
};

const getRunState = (namespace: string, runId: string): string | null => {
  const result = runOc([
    'exec',
    'deploy/ds-pipeline-dspa',
    '-n',
    namespace,
    '-c',
    'ds-pipeline-api-server',
    '--',
    'curl',
    '-ksSf',
    '--max-time',
    '15',
    `https://localhost:8888/apis/v2beta1/runs/${runId}`,
  ]);
  if (result.exitCode !== 0) {
    return null;
  }
  try {
    const response: unknown = JSON.parse(result.stdout);
    return typeof response === 'object' && response !== null && 'state' in response
      ? String(response.state)
      : null;
  } catch {
    return null;
  }
};

const settleRun = async (namespace: string, runId: string): Promise<boolean> => {
  const state = getRunState(namespace, runId);
  if (state && TERMINAL_STATES.has(state)) {
    return true;
  }
  if (!state) {
    return false;
  }
  if (TERMINATABLE_STATES.has(state)) {
    const result = runOc([
      'exec',
      'deploy/ds-pipeline-dspa',
      '-n',
      namespace,
      '-c',
      'ds-pipeline-api-server',
      '--',
      'curl',
      '-ksSf',
      '--max-time',
      '15',
      '-X',
      'POST',
      `https://localhost:8888/apis/v2beta1/runs/${runId}:terminate`,
    ]);
    if (result.exitCode !== 0) {
      return false;
    }
  }
  for (let attempt = 0; attempt < 24; attempt++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5000);
    });
    const current = getRunState(namespace, runId);
    if (current && TERMINAL_STATES.has(current)) {
      return true;
    }
    if (!current) {
      return false;
    }
  }
  return false;
};

const runS3Cleanup = (
  project: AutomlCleanupProject,
  buckets: AWSS3Buckets,
  options: CliOptions,
): string[] => {
  const errors: string[] = [];
  const redact = (value: string): string =>
    [buckets.AWS_ACCESS_KEY_ID, buckets.AWS_SECRET_ACCESS_KEY].reduce(
      (result, secret) => (secret ? result.split(secret).join('***') : result),
      value,
    );
  const podName = `automl-s3-recover-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  const secretName = `${podName}-creds`;
  const bucket = buckets[project.bucketKey];
  const script = buildAutomlS3CleanupScript(bucket, project);
  const secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: secretName, namespace: options.executorNamespace },
    stringData: {
      AWS_ACCESS_KEY_ID: buckets.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: buckets.AWS_SECRET_ACCESS_KEY,
      AWS_DEFAULT_REGION: bucket.REGION,
    },
  };
  const podOverrides = {
    spec: {
      activeDeadlineSeconds: Math.ceil(S3_CLEANUP_TIMEOUT_MS / 1000) + CLEANUP_POD_HEADROOM_SECONDS,
      containers: [
        {
          name: podName,
          image: options.image,
          command: ['sh', '-c'],
          args: [script],
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
  };

  const secretResult = runOc(['apply', '-f', '-'], `${JSON.stringify(secret)}\n`);
  if (secretResult.exitCode !== 0) {
    const secretDelete = runOc([
      'delete',
      'secret',
      secretName,
      '-n',
      options.executorNamespace,
      '--ignore-not-found',
    ]);
    const message = `Could not create cleanup credentials for ${project.namespace}: ${redact(
      secretResult.stderr,
    )}`;
    return secretDelete.exitCode === 0
      ? [message]
      : [message, `Could not delete cleanup Secret ${secretName}: ${redact(secretDelete.stderr)}`];
  }

  try {
    const result = runOc(
      [
        'run',
        podName,
        '-n',
        options.executorNamespace,
        `--image=${options.image}`,
        '--restart=Never',
        '--attach',
        '--tty=false',
        '--pod-running-timeout=300s',
        `--overrides=${JSON.stringify(podOverrides)}`,
      ],
      undefined,
      S3_CLEANUP_TIMEOUT_MS,
    );
    if (result.exitCode !== 0) {
      const describe = runOc(['describe', 'pod', podName, '-n', options.executorNamespace]);
      errors.push(
        `S3 cleanup failed for ${project.namespace}: ${redact(
          `${result.stderr}\n${result.stdout}\n${describe.stdout}`.slice(0, 6000),
        )}`,
      );
    }
  } finally {
    const podDelete = runOc([
      'delete',
      'pod',
      podName,
      '-n',
      options.executorNamespace,
      '--wait=false',
      '--ignore-not-found',
    ]);
    if (podDelete.exitCode !== 0) {
      errors.push(`Could not delete cleanup pod ${podName}: ${redact(podDelete.stderr)}`);
    }
    const secretDelete = runOc([
      'delete',
      'secret',
      secretName,
      '-n',
      options.executorNamespace,
      '--ignore-not-found',
    ]);
    if (secretDelete.exitCode !== 0) {
      errors.push(`Could not delete cleanup Secret ${secretName}: ${redact(secretDelete.stderr)}`);
    }
  }
  return errors;
};

const deleteProject = async (namespace: string): Promise<string | null> => {
  const result = runOc(['delete', 'project', namespace, '--wait=false', '--ignore-not-found']);
  if (result.exitCode !== 0) {
    return `Project deletion request failed for ${namespace}: ${result.stderr}`;
  }
  for (let attempt = 0; attempt < 24; attempt++) {
    const status = namespaceStatus(namespace);
    if (!status.exists) {
      return null;
    }
    if (attempt < 23) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }
  const status = namespaceStatus(namespace);
  return `Project ${namespace} remains after cleanup; finalizers=${status.finalizers.join(',')}`;
};

const applyManifest = async (
  filePath: string,
  manifest: AutomlCleanupManifest,
  buckets: AWSS3Buckets,
  options: CliOptions,
): Promise<boolean> => {
  let success = true;
  for (const project of manifest.projects) {
    assertAutomlCleanupProject(project);
    const errors: string[] = [];
    let runsTerminal = false;
    try {
      const status = namespaceStatus(project.namespace);
      runsTerminal = !status.exists;
      if (status.exists) {
        const terminatingWithoutPods =
          status.phase === 'Terminating' && namespacePodCount(project.namespace) === 0;
        if (terminatingWithoutPods) {
          runsTerminal = true;
          process.stdout.write(
            `${project.namespace}: terminating with no pods; treating recorded runs as settled\n`,
          );
        } else {
          runsTerminal = true;
          for (const run of project.runs) {
            if (!(await settleRun(project.namespace, run.id))) {
              errors.push(`KFP run ${run.id} was not confirmed terminal`);
              runsTerminal = false;
            }
          }
        }
      }
    } catch (error) {
      errors.push(
        `Could not inspect ${project.namespace}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (runsTerminal && !project.s3Cleaned) {
      try {
        if (project.uploads.length > 0 || project.runs.length > 0) {
          errors.push(...runS3Cleanup(project, buckets, options));
        }
        project.s3Cleaned = errors.length === 0;
      } catch (error) {
        errors.push(
          `S3 cleanup could not run for ${project.namespace}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    try {
      const deletionError = await deleteProject(project.namespace);
      project.projectDeleted = deletionError === null;
      if (deletionError) {
        errors.push(deletionError);
      }
    } catch (error) {
      project.projectDeleted = false;
      errors.push(
        `Project deletion could not be verified for ${project.namespace}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    project.errors = errors;
    writeAutomlCleanupManifest(filePath, manifest);
    if (errors.length > 0) {
      success = false;
      process.stderr.write(`${project.namespace}: ${errors.join('; ')}\n`);
    } else {
      process.stdout.write(`${project.namespace}: cleanup verified\n`);
    }
  }
  return success;
};

const main = async (): Promise<void> => {
  const options = parseOptions();
  const paths = listManifestPaths(options.directory);
  if (paths.length === 0) {
    process.stdout.write(`No AutoML cleanup manifests in ${options.directory}\n`);
    return;
  }
  for (const filePath of paths) {
    const manifest = readAutomlCleanupManifest(filePath);
    for (const project of manifest.projects) {
      assertAutomlCleanupProject(project);
      process.stdout.write(
        `${manifest.jobName} #${manifest.buildNumber} ${project.namespace}: ` +
          `${project.uploads.length} uploaded key(s), ${project.runs.length} run output(s), ` +
          `S3 ${project.s3Cleaned ? 'clean' : 'pending'}, project ${
            project.projectDeleted ? 'deleted' : 'pending'
          }\n`,
      );
      for (const key of project.uploads) {
        process.stdout.write(`  input: ${key}\n`);
      }
      for (const run of project.runs) {
        process.stdout.write(`  output: ${run.outputRoot}/${run.id}/\n`);
      }
    }
  }
  if (!options.apply) {
    process.stdout.write('Dry-run only. Use --apply to retry cleanup.\n');
    return;
  }
  if (!NAMESPACE.test(options.executorNamespace) || options.executorNamespace.length > 63) {
    throw new Error('Set --namespace to an existing, stable cleanup executor project');
  }
  if (!options.context) {
    throw new Error('Set --context to the oc context for the intended cluster');
  }
  cleanupOcContext = options.context;
  if (!process.env.CY_TEST_CONFIG) {
    throw new Error('CY_TEST_CONFIG is required for S3 credentials when using --apply');
  }
  const executor = namespaceStatus(options.executorNamespace);
  if (!executor.exists) {
    throw new Error(`Cleanup executor namespace ${options.executorNamespace} does not exist`);
  }
  const serverResult = runOc(['whoami', '--show-server']);
  if (serverResult.exitCode !== 0 || !serverResult.stdout.trim()) {
    throw new Error(`Could not identify the cluster for oc context ${options.context}`);
  }
  const { cypressEnv } = await import('../cypress/utils/testConfig');
  const buckets: AWSS3Buckets = cypressEnv.AWS_PIPELINES;
  if (!buckets.AWS_ACCESS_KEY_ID || !buckets.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AutoML S3 credentials are missing from CY_TEST_CONFIG');
  }
  // Check every manifest before any deletion; mixed build artifacts must never
  // cause an object or namespace to be deleted on the wrong cluster.
  for (const filePath of paths) {
    const manifest = readAutomlCleanupManifest(filePath);
    for (const project of manifest.projects) {
      if (!project.namespace.startsWith('cy-e2e-automl-')) {
        throw new Error(`Refusing to clean an unrelated project: ${project.namespace}`);
      }
      if (project.clusterServer !== serverResult.stdout.trim()) {
        throw new Error(`Cluster mismatch for ${project.namespace}: ${project.clusterServer}`);
      }
      if (project.bucketName !== buckets[project.bucketKey].NAME) {
        throw new Error(`S3 bucket mismatch for ${project.namespace}: ${project.bucketName}`);
      }
    }
  }
  let success = true;
  for (const filePath of paths) {
    const manifest = readAutomlCleanupManifest(filePath);
    if (!(await applyManifest(filePath, manifest, buckets, options))) {
      success = false;
    }
  }
  if (!success) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
