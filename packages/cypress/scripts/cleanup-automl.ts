import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import {
  AUTOML_CLEANUP_OWNER_LABEL,
  assertAutomlCleanupProject,
  buildAutomlS3CleanupScript,
  DEFAULT_AWS_CLI_IMAGE,
  matchesAutomlCleanupOwnership,
} from '../src/automlCleanupCommands';
import {
  readAutomlCleanupManifest,
  writeAutomlCleanupManifest,
  type AutomlCleanupManifest,
  type AutomlCleanupProject,
} from '../src/automlCleanupManifest';
import {
  AUTOML_RECOVERY_MANAGED_BY,
  AUTOML_RECOVERY_MANAGED_BY_LABEL,
  AUTOML_RECOVERY_ORPHAN_AGE_MS,
  AUTOML_RECOVERY_RUN_ID_LABEL,
  assertAutomlCleanupTarget,
  buildRecoveryJobManifest,
  buildRecoverySecretManifest,
  buildRecoverySecretOwnerReference,
  isAutomlCleanupComplete,
  isStaleUnownedRecoverySecret,
} from '../src/automlCleanupRecovery';
import { deleteOpenShiftProjectWithUid } from '../src/automlProjectDeletion';
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
const RECOVERY_POLL_INTERVAL_MS = 5000;
let cleanupOcContext = '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const optionValue = (name: string): string | undefined =>
    args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: node --import tsx scripts/cleanup-automl.ts [--apply] [--context=OC_CONTEXT] ' +
        '[--namespace=PROJECT] [--manifest-dir=DIR]\n' +
        'Cleans recorded AutoML and AutoRAG resources. Dry-run is the default.\n' +
        '--apply requires an explicit oc context and stable executor namespace, ' +
        'CY_TEST_CONFIG, and an S3 endpoint matching the configured bucket or ' +
        'CYPRESS_DSPA_S3_ENDPOINT.\n' +
        'Context and namespace may use CY_AUTOX_CLEANUP_CONTEXT and CY_AUTOX_CLEANUP_NAMESPACE.\n' +
        'The AWS CLI image may use CY_S3_CLEANUP_IMAGE; AWS_CLI_IMAGE is also accepted.\n',
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
    executorNamespace:
      optionValue('--namespace') ??
      process.env.CY_AUTOX_CLEANUP_NAMESPACE ??
      process.env.CY_AUTOML_CLEANUP_NAMESPACE ??
      '',
    context:
      optionValue('--context') ??
      process.env.CY_AUTOX_CLEANUP_CONTEXT ??
      process.env.CY_AUTOML_CLEANUP_CONTEXT ??
      '',
    image: process.env.CY_S3_CLEANUP_IMAGE || process.env.AWS_CLI_IMAGE || DEFAULT_AWS_CLI_IMAGE,
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
): {
  exists: boolean;
  finalizers: string[];
  phase: string | null;
  uid?: string;
  cleanupToken?: string;
} => {
  const result = runOc(['get', 'namespace', namespace, '-o', 'json', '--ignore-not-found']);
  if (result.exitCode !== 0) {
    throw new Error(`Could not inspect namespace ${namespace}: ${result.stderr}`);
  }
  if (!result.stdout.trim()) {
    return { exists: false, finalizers: [], phase: null };
  }
  const response: unknown = JSON.parse(result.stdout);
  if (!isRecord(response) || !isRecord(response.metadata)) {
    throw new Error(`Invalid namespace response for ${namespace}`);
  }
  const { metadata } = response;
  const spec = isRecord(response.spec) ? response.spec : undefined;
  const status = isRecord(response.status) ? response.status : undefined;
  const finalizers = Array.isArray(metadata.finalizers)
    ? metadata.finalizers.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  if (spec && Array.isArray(spec.finalizers)) {
    finalizers.push(
      ...spec.finalizers.filter((item: unknown): item is string => typeof item === 'string'),
    );
  }
  const phase = typeof status?.phase === 'string' ? status.phase : null;
  const uid = typeof metadata.uid === 'string' ? metadata.uid : undefined;
  const labels = isRecord(metadata.labels) ? metadata.labels : {};
  const token = labels[AUTOML_CLEANUP_OWNER_LABEL];
  const cleanupToken = typeof token === 'string' ? token : undefined;
  return { exists: true, finalizers, phase, uid, cleanupToken };
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

const runS3Cleanup = async (
  project: AutomlCleanupProject,
  buckets: AWSS3Buckets,
  options: CliOptions,
): Promise<string[]> => {
  const errors: string[] = [];
  const redact = (value: string): string =>
    [buckets.AWS_ACCESS_KEY_ID, buckets.AWS_SECRET_ACCESS_KEY].reduce(
      (result, secret) => (secret ? result.split(secret).join('***') : result),
      value,
    );
  const runId = randomBytes(8).toString('hex');
  const jobName = `autox-s3-${runId}`;
  const secretName = `${jobName}-creds`;
  const bucket = buckets[project.bucketKey];
  const script = buildAutomlS3CleanupScript(bucket, project);
  const secret = buildRecoverySecretManifest(options.executorNamespace, secretName, runId, {
    accessKeyId: buckets.AWS_ACCESS_KEY_ID,
    secretAccessKey: buckets.AWS_SECRET_ACCESS_KEY,
    region: bucket.REGION,
    caBundle: buckets.AWS_CA_BUNDLE,
  });
  const job = buildRecoveryJobManifest({
    namespace: options.executorNamespace,
    jobName,
    secretName,
    image: options.image,
    script,
    timeoutMs: S3_CLEANUP_TIMEOUT_MS,
    caBundle: buckets.AWS_CA_BUNDLE,
  });

  const secretResult = runOc(['create', '-f', '-'], `${JSON.stringify(secret)}\n`);
  if (secretResult.exitCode !== 0) {
    const message = `Could not create cleanup credentials for ${project.namespace}: ${redact(
      secretResult.stderr,
    )}`;
    return [message];
  }

  try {
    const jobResult = runOc(['create', '-f', '-'], `${JSON.stringify(job)}\n`);
    if (jobResult.exitCode !== 0) {
      throw new Error(`Could not create S3 cleanup Job: ${jobResult.stderr}`);
    }
    const jobInfo = runOc(['get', 'job', jobName, '-n', options.executorNamespace, '-o', 'json']);
    if (jobInfo.exitCode !== 0) {
      throw new Error(`Could not inspect S3 cleanup Job: ${jobInfo.stderr}`);
    }
    const jobResponse: unknown = JSON.parse(jobInfo.stdout);
    if (!isRecord(jobResponse) || !isRecord(jobResponse.metadata)) {
      throw new Error(`Invalid S3 cleanup Job response for ${jobName}`);
    }
    const jobMetadata = jobResponse.metadata;
    const jobUID = typeof jobMetadata.uid === 'string' ? jobMetadata.uid : undefined;
    const jobLabels = isRecord(jobMetadata.labels) ? jobMetadata.labels : {};
    if (
      !jobUID ||
      jobLabels[AUTOML_RECOVERY_MANAGED_BY_LABEL] !== AUTOML_RECOVERY_MANAGED_BY ||
      jobLabels[AUTOML_RECOVERY_RUN_ID_LABEL] !== runId
    ) {
      throw new Error(`S3 cleanup Job ${jobName} does not match this recovery run`);
    }
    const ownerReference = buildRecoverySecretOwnerReference(jobName, jobUID);
    const ownerPatch = runOc([
      'patch',
      'secret',
      secretName,
      '-n',
      options.executorNamespace,
      '--type=merge',
      '-p',
      JSON.stringify({ metadata: { ownerReferences: [ownerReference] } }),
    ]);
    if (ownerPatch.exitCode !== 0) {
      throw new Error(`Could not attach cleanup Secret to Job: ${ownerPatch.stderr}`);
    }

    let jobState: 'complete' | 'failed' | undefined;
    const deadline = Date.now() + S3_CLEANUP_TIMEOUT_MS + 30000;
    while (!jobState && Date.now() < deadline) {
      const statusResult = runOc([
        'get',
        'job',
        jobName,
        '-n',
        options.executorNamespace,
        '-o',
        'json',
      ]);
      if (statusResult.exitCode !== 0) {
        throw new Error(`Could not read S3 cleanup Job status: ${statusResult.stderr}`);
      }
      const response: unknown = JSON.parse(statusResult.stdout);
      if (isRecord(response) && isRecord(response.status)) {
        const { status } = response;
        const conditions = Array.isArray(status.conditions) ? status.conditions : [];
        if (
          conditions.some(
            (condition) =>
              isRecord(condition) && condition.type === 'Complete' && condition.status === 'True',
          )
        ) {
          jobState = 'complete';
        } else if (
          conditions.some(
            (condition) =>
              isRecord(condition) && condition.type === 'Failed' && condition.status === 'True',
          ) ||
          (typeof status.failed === 'number' && status.failed > 0)
        ) {
          jobState = 'failed';
        }
      }
      if (!jobState) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, RECOVERY_POLL_INTERVAL_MS);
        });
      }
    }
    const logs = runOc(['logs', `job/${jobName}`, '-n', options.executorNamespace]);
    if (jobState !== 'complete' || logs.exitCode !== 0) {
      const describe = runOc(['describe', 'job', jobName, '-n', options.executorNamespace]);
      const diagnostics = [
        jobState ?? 'timed out',
        logs.stderr,
        logs.stdout,
        describe.stdout,
        describe.stderr,
      ].join('\n');
      errors.push(
        `S3 cleanup failed for ${project.namespace}: ${redact(diagnostics.slice(0, 6000))}`,
      );
    }
  } finally {
    const jobDelete = runOc([
      'delete',
      'job',
      jobName,
      '-n',
      options.executorNamespace,
      '--wait=false',
      '--ignore-not-found',
    ]);
    if (jobDelete.exitCode !== 0) {
      errors.push(`Could not delete cleanup Job ${jobName}: ${redact(jobDelete.stderr)}`);
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

const sweepOrphanedRecoverySecrets = (namespace: string): void => {
  const list = runOc([
    'get',
    'secrets',
    '-n',
    namespace,
    '-l',
    `${AUTOML_RECOVERY_MANAGED_BY_LABEL}=${AUTOML_RECOVERY_MANAGED_BY}`,
    '-o',
    'json',
  ]);
  if (list.exitCode !== 0) {
    throw new Error(`Could not inspect old cleanup Secrets in ${namespace}: ${list.stderr}`);
  }
  const response: unknown = JSON.parse(list.stdout);
  if (
    typeof response !== 'object' ||
    response === null ||
    !('items' in response) ||
    !Array.isArray(response.items)
  ) {
    throw new Error(`Invalid cleanup Secret list response in ${namespace}`);
  }
  for (const secret of response.items) {
    if (!isStaleUnownedRecoverySecret(secret)) {
      continue;
    }
    if (!isRecord(secret) || !isRecord(secret.metadata)) {
      continue;
    }
    const { metadata } = secret;
    const { name: secretName } = metadata;
    if (typeof secretName !== 'string') {
      continue;
    }
    const labels = isRecord(metadata.labels) ? metadata.labels : {};
    const runId = labels[AUTOML_RECOVERY_RUN_ID_LABEL];
    if (typeof runId !== 'string' || !/^[a-f0-9]{16}$/.test(runId)) {
      continue;
    }
    const jobName = `autox-s3-${runId}`;
    if (secretName !== `${jobName}-creds`) {
      continue;
    }
    const job = runOc(['get', 'job', jobName, '-n', namespace, '--ignore-not-found', '-o', 'json']);
    if (job.exitCode !== 0) {
      throw new Error(`Could not check owner Job ${jobName}: ${job.stderr}`);
    }
    if (job.stdout.trim()) {
      const jobResponse: unknown = JSON.parse(job.stdout);
      if (!isRecord(jobResponse) || !isRecord(jobResponse.metadata)) {
        throw new Error(`Owner Job ${jobName} has an invalid response`);
      }
      const jobMetadata = jobResponse.metadata;
      const jobUID = typeof jobMetadata.uid === 'string' ? jobMetadata.uid : undefined;
      const jobLabels = isRecord(jobMetadata.labels) ? jobMetadata.labels : {};
      if (
        !jobUID ||
        jobLabels[AUTOML_RECOVERY_MANAGED_BY_LABEL] !== AUTOML_RECOVERY_MANAGED_BY ||
        jobLabels[AUTOML_RECOVERY_RUN_ID_LABEL] !== runId
      ) {
        throw new Error(`Owner Job ${jobName} does not match; retaining Secret ${secretName}`);
      }
      const ownerPatch = runOc([
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
      ]);
      if (ownerPatch.exitCode !== 0) {
        throw new Error(
          `Could not attach orphan Secret ${secretName} to ${jobName}: ${ownerPatch.stderr}`,
        );
      }
      continue;
    }
    const deletion = runOc(['delete', 'secret', secretName, '-n', namespace, '--ignore-not-found']);
    if (deletion.exitCode !== 0) {
      throw new Error(`Could not delete stale cleanup Secret ${secretName}: ${deletion.stderr}`);
    }
    process.stdout.write(
      `Deleted stale unowned cleanup Secret ${secretName} (older than ${
        AUTOML_RECOVERY_ORPHAN_AGE_MS / 60000
      } minutes)\n`,
    );
  }
};

const deleteProject = async (namespace: string, namespaceUID: string): Promise<string | null> => {
  const result = await deleteOpenShiftProjectWithUid(namespace, namespaceUID, cleanupOcContext);
  if (!result.deleted) {
    return `Project deletion request failed for ${namespace}: ${result.error ?? 'unknown error'}`;
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
    if (isAutomlCleanupComplete(project)) {
      continue;
    }
    assertAutomlCleanupProject(project);
    const errors: string[] = [];
    let status: ReturnType<typeof namespaceStatus> = {
      exists: false,
      finalizers: [],
      phase: null,
    };
    let ownershipValidated = project.projectDeleted;
    let runsTerminal = project.projectDeleted;
    try {
      if (!project.projectDeleted) {
        if (!project.cleanupToken) {
          throw new Error('manifest is missing its recorded cleanup token');
        }
        status = namespaceStatus(project.namespace);
        if (status.exists && !matchesAutomlCleanupOwnership(project, status)) {
          throw new Error('current namespace UID or cleanup token does not match the manifest');
        }
        ownershipValidated = true;
        runsTerminal = !status.exists;
      }
      if (ownershipValidated && status.exists) {
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
      ownershipValidated = false;
    }

    if (ownershipValidated && runsTerminal && !project.s3Cleaned) {
      try {
        if (project.uploads.length > 0 || project.runs.length > 0) {
          if (
            (!status.exists || project.projectDeleted) &&
            options.executorNamespace === project.namespace
          ) {
            errors.push(`A stable cleanup executor namespace is required for ${project.namespace}`);
          } else {
            errors.push(...(await runS3Cleanup(project, buckets, options)));
          }
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

    if (ownershipValidated && runsTerminal && !project.projectDeleted) {
      if (!status.exists) {
        // The namespace is already gone. Do not repeat a deletion by name, which
        // could target a newer project created after this manifest was written.
        project.projectDeleted = true;
      } else if (!status.uid) {
        errors.push(`Namespace UID is missing for ${project.namespace}; refusing deletion`);
      } else {
        try {
          const deletionError = await deleteProject(project.namespace, status.uid);
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
      }
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
    process.stdout.write(`No AutoX cleanup manifests in ${options.directory}\n`);
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
      process.stdout.write(`  S3 endpoint: ${project.s3Endpoint ?? '(missing)'}\n`);
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
    throw new Error('AutoX S3 credentials are missing from CY_TEST_CONFIG');
  }
  // Check every manifest before any deletion; mixed build artifacts must never
  // cause an object or namespace to be deleted on the wrong cluster.
  for (const filePath of paths) {
    const manifest = readAutomlCleanupManifest(filePath);
    for (const project of manifest.projects) {
      if (isAutomlCleanupComplete(project)) {
        continue;
      }
      assertAutomlCleanupTarget(
        project,
        serverResult.stdout.trim(),
        buckets[project.bucketKey].NAME,
        [
          buckets[project.bucketKey].ENDPOINT,
          process.env.CYPRESS_DSPA_S3_ENDPOINT?.trim() ||
            process.env.DSPA_S3_ENDPOINT?.trim() ||
            '',
        ].filter(Boolean),
      );
      if (!project.projectDeleted) {
        if (!project.cleanupToken) {
          throw new Error(
            `Ownership token is missing for ${project.namespace}; refusing recovery deletion`,
          );
        }
        const status = namespaceStatus(project.namespace);
        if (status.exists) {
          if (status.cleanupToken !== project.cleanupToken || !status.uid) {
            throw new Error(
              `Namespace ownership mismatch for ${project.namespace}; refusing recovery cleanup`,
            );
          }
          if (project.namespaceUID && status.uid !== project.namespaceUID) {
            throw new Error(
              `Namespace UID mismatch for ${project.namespace}; refusing recovery cleanup`,
            );
          }
          if (!project.namespaceUID) {
            // Recover a process interrupted after applying the unique marker but
            // before persisting the namespace UID to its manifest.
            project.namespaceUID = status.uid;
            writeAutomlCleanupManifest(filePath, manifest);
          }
        }
      }
    }
  }
  sweepOrphanedRecoverySecrets(options.executorNamespace);
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
