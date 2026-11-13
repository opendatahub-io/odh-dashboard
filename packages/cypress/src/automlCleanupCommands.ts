import type { AutoXOutputRoot, AutomlCleanupProject } from './automlCleanupManifest';
import type { AWSS3BucketDetails } from '../cypress/types';

export const AUTOML_CLEANUP_OWNER_LABEL = 'odh-dashboard.io/autox-cleanup-token';

export const isValidAutoXS3Endpoint = (endpoint: string): boolean => {
  if (!endpoint || endpoint.trim() !== endpoint) {
    return false;
  }
  try {
    const parsed = new URL(endpoint);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      !endpoint.includes('?') &&
      !endpoint.includes('#')
    );
  } catch {
    return false;
  }
};

export const buildAutoXProjectManifest = (
  namespace: string,
  cleanupToken: string,
): Record<string, unknown> => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace) || namespace.length > 63) {
    throw new Error('Invalid AutoX project name');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/.test(cleanupToken)) {
    throw new Error('Invalid AutoX project cleanup token');
  }
  return {
    apiVersion: 'project.openshift.io/v1',
    kind: 'Project',
    metadata: {
      name: namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
        [AUTOML_CLEANUP_OWNER_LABEL]: cleanupToken,
      },
    },
  };
};

export const matchesAutomlCleanupOwnership = (
  project: Pick<AutomlCleanupProject, 'cleanupToken' | 'namespaceUID'>,
  namespace: { cleanupToken?: string; uid?: string },
): boolean =>
  Boolean(
    project.cleanupToken &&
      project.namespaceUID &&
      namespace.cleanupToken === project.cleanupToken &&
      namespace.uid === project.namespaceUID,
  );

export type AutoXCleanupSafetyState = {
  runsTerminal: boolean;
  namespaceExists: boolean;
  owned: boolean;
  inspectionFailed: boolean;
  namespaceUID?: string;
};

export type AutoXCleanupActions = {
  canCleanS3: boolean;
  projectDeletion: 'delete' | 'already-complete' | 'retain';
};

/** Keep S3 and namespace cleanup behind run-settlement and ownership checks. */
export const getAutoXCleanupActions = (
  project: Pick<AutomlCleanupProject, 'uploads' | 'runs' | 's3Cleaned' | 'projectDeleted'>,
  state: AutoXCleanupSafetyState,
): AutoXCleanupActions => {
  const hasS3Work = project.uploads.length > 0 || project.runs.length > 0;
  const canCleanS3 =
    !state.inspectionFailed &&
    !project.s3Cleaned &&
    hasS3Work &&
    state.runsTerminal &&
    (!state.namespaceExists || state.owned) &&
    (project.projectDeleted || Boolean(state.namespaceUID));

  let projectDeletion: AutoXCleanupActions['projectDeletion'];
  if (state.inspectionFailed) {
    projectDeletion = project.projectDeleted ? 'already-complete' : 'retain';
  } else if (project.projectDeleted || !state.namespaceExists) {
    projectDeletion = 'already-complete';
  } else if (state.runsTerminal && state.owned && state.namespaceUID) {
    projectDeletion = 'delete';
  } else {
    projectDeletion = 'retain';
  }

  return { canCleanS3, projectDeletion };
};

export const DEFAULT_AWS_CLI_IMAGE =
  'amazon/aws-cli:2.27.50@sha256:48c3d4212e2f5b0e24bdc6af7708f9412ce65425a79575e0f78b8f8c0dcd70ab';

export const AUTORAG_OUTPUT_ROOT = 'documents-rag-optimization-pipeline';

const OUTPUT_ROOTS: ReadonlySet<AutoXOutputRoot> = new Set([
  'autogluon-tabular-training-pipeline',
  'autogluon-timeseries-training-pipeline',
  AUTORAG_OUTPUT_ROOT,
]);

/** Keep all values in a single shell argument when running the AWS CLI pod. */
export const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

export const assertAutomlCleanupProject = (project: AutomlCleanupProject): void => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(project.namespace)) {
    throw new Error(`Invalid AutoML cleanup namespace: ${project.namespace}`);
  }
  for (const key of project.uploads) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/.test(key)) {
      throw new Error(`Invalid AutoML uploaded key in ${project.namespace}`);
    }
  }
  if (project.s3Endpoint !== undefined && !isValidAutoXS3Endpoint(project.s3Endpoint)) {
    throw new Error(`Invalid AutoML S3 endpoint in ${project.namespace}`);
  }
  if (
    project.cleanupToken !== undefined &&
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/.test(project.cleanupToken)
  ) {
    throw new Error(`Invalid AutoML cleanup token in ${project.namespace}`);
  }
  if (project.namespaceUID !== undefined && !/^[A-Za-z0-9-]{1,128}$/.test(project.namespaceUID)) {
    throw new Error(`Invalid AutoML namespace UID in ${project.namespace}`);
  }
  for (const run of project.runs) {
    if (!/^[A-Za-z0-9-]{1,128}$/.test(run.id)) {
      throw new Error(`Invalid AutoML run ID in ${project.namespace}`);
    }
    if (!OUTPUT_ROOTS.has(run.outputRoot)) {
      throw new Error(`Invalid AutoML output root in ${project.namespace}`);
    }
  }
};

/** Delete exact uploaded keys and run output prefixes, then check that each is absent. */
export const buildAutomlS3CleanupScript = (
  bucket: AWSS3BucketDetails,
  project: AutomlCleanupProject,
): string => {
  assertAutomlCleanupProject(project);
  if (!bucket.NAME || !bucket.REGION) {
    throw new Error(`Missing AutoML S3 bucket configuration for ${project.bucketKey}`);
  }
  if (bucket.NAME !== project.bucketName) {
    throw new Error(`AutoML S3 bucket does not match the recorded bucket for ${project.namespace}`);
  }

  const endpoint = project.s3Endpoint ?? bucket.ENDPOINT;
  const aws = `aws --region ${shellQuote(bucket.REGION)}${
    endpoint ? ` --endpoint-url ${shellQuote(endpoint)}` : ''
  }`;
  const bucketArg = `--bucket ${shellQuote(bucket.NAME)}`;
  const lines = ['set -u', 'failed=0'];

  for (const key of project.uploads) {
    const exactKeyQuery = `length(Contents[?Key=='${key}'] || \`[]\`)`;
    lines.push(
      `if ${aws} s3api delete-object ${bucketArg} --key ${shellQuote(key)} >/dev/null; then`,
      `  if count=$(${aws} s3api list-objects-v2 ${bucketArg} --prefix ${shellQuote(
        key,
      )} --max-keys 1 --no-paginate --query ${shellQuote(exactKeyQuery)} --output text); then`,
      `    if [ "$count" != '0' ]; then echo ${shellQuote(
        `Input key remains: ${key}`,
      )}; failed=1; fi`,
      '  else echo "Input key verification failed"; failed=1; fi',
      `else echo ${shellQuote(`Input key deletion failed: ${key}`)}; failed=1; fi`,
    );
  }

  for (const run of project.runs) {
    const prefix = `${run.outputRoot}/${run.id}/`;
    lines.push(
      `if ${aws} s3 rm ${shellQuote(
        `s3://${bucket.NAME}/${prefix}`,
      )} --recursive --only-show-errors; then`,
      `  if count=$(${aws} s3api list-objects-v2 ${bucketArg} --prefix ${shellQuote(
        prefix,
      )} --max-keys 1 --no-paginate --query KeyCount --output text); then`,
      `    if [ "$count" != '0' ]; then echo ${shellQuote(
        `Run output remains: ${prefix}`,
      )}; failed=1; fi`,
      '  else echo "Run output verification failed"; failed=1; fi',
      `else echo ${shellQuote(`Run output deletion failed: ${prefix}`)}; failed=1; fi`,
    );
  }

  lines.push('exit "$failed"');
  return lines.join('\n');
};
