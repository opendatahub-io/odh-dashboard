import type { AutomlCleanupProject } from './automlCleanupManifest';
import { isValidAutoXS3Endpoint } from './automlCleanupCommands';

export const AUTOML_RECOVERY_MANAGED_BY_LABEL = 'app.kubernetes.io/managed-by';
export const AUTOML_RECOVERY_MANAGED_BY = 'odh-dashboard-cypress-cleanup';
export const AUTOML_RECOVERY_RUN_ID_LABEL = 'odh-dashboard.io/automl-cleanup-run';
export const AUTOML_RECOVERY_ORPHAN_AGE_MS = 60 * 60 * 1000;
export const AUTOML_RECOVERY_JOB_TTL_SECONDS = 300;

const AUTOML_CLEANUP_NAMESPACE_PREFIXES = ['cy-e2e-automl-', 'cy-e2e-autorag-'];

export const isAutomlCleanupComplete = (project: {
  projectDeleted: boolean;
  s3Cleaned: boolean;
}): boolean => project.projectDeleted && project.s3Cleaned;

export const assertAutomlCleanupTarget = (
  project: Pick<
    AutomlCleanupProject,
    'namespace' | 'clusterServer' | 'bucketName' | 'uploads' | 'runs' | 's3Cleaned' | 's3Endpoint'
  >,
  clusterServer: string,
  bucketName: string,
  allowedS3Endpoints: readonly string[] = [],
): void => {
  if (!AUTOML_CLEANUP_NAMESPACE_PREFIXES.some((prefix) => project.namespace.startsWith(prefix))) {
    throw new Error(`Refusing to clean an unrelated project: ${project.namespace}`);
  }
  if (project.clusterServer !== clusterServer) {
    throw new Error(`Cluster mismatch for ${project.namespace}: ${project.clusterServer}`);
  }
  if (project.bucketName !== bucketName) {
    throw new Error(`S3 bucket mismatch for ${project.namespace}: ${project.bucketName}`);
  }
  const needsS3Cleanup =
    !project.s3Cleaned && (project.uploads.length > 0 || project.runs.length > 0);
  if (needsS3Cleanup) {
    if (!project.s3Endpoint || !isValidAutoXS3Endpoint(project.s3Endpoint)) {
      throw new Error(`Recorded S3 endpoint is missing or invalid for ${project.namespace}`);
    }
    if (!allowedS3Endpoints.includes(project.s3Endpoint)) {
      throw new Error(
        `Recorded S3 endpoint for ${project.namespace} does not match the configured bucket ` +
          'endpoint or CYPRESS_DSPA_S3_ENDPOINT',
      );
    }
  }
};
type RecoveryCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  caBundle?: string;
};

type RecoveryJobOptions = {
  namespace: string;
  jobName: string;
  secretName: string;
  image: string;
  containerName?: string;
  script?: string;
  command?: string[];
  args?: string[];
  timeoutMs: number;
  caBundle?: string;
};

export const buildRecoverySecretManifest = (
  namespace: string,
  secretName: string,
  runId: string,
  credentials: RecoveryCredentials,
): Record<string, unknown> => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: secretName,
    namespace,
    labels: {
      [AUTOML_RECOVERY_MANAGED_BY_LABEL]: AUTOML_RECOVERY_MANAGED_BY,
      [AUTOML_RECOVERY_RUN_ID_LABEL]: runId,
    },
  },
  stringData: {
    AWS_ACCESS_KEY_ID: credentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
    AWS_DEFAULT_REGION: credentials.region,
    ...(credentials.caBundle ? { AWS_CA_BUNDLE_PEM: credentials.caBundle } : {}),
  },
});

export const buildRecoveryJobManifest = (options: RecoveryJobOptions): Record<string, unknown> => {
  if (options.script === undefined && options.args === undefined) {
    throw new Error('A recovery Job script or container args are required');
  }
  const containerArgs = options.args ?? (options.script === undefined ? [] : [options.script]);
  const labels = {
    [AUTOML_RECOVERY_MANAGED_BY_LABEL]: AUTOML_RECOVERY_MANAGED_BY,
    [AUTOML_RECOVERY_RUN_ID_LABEL]: options.jobName.replace('autox-s3-', ''),
  };
  const container: Record<string, unknown> = {
    name: options.containerName ?? options.jobName,
    image: options.image,
    args: containerArgs,
    envFrom: [{ secretRef: { name: options.secretName } }],
    securityContext: {
      runAsGroup: 1001,
      runAsNonRoot: true,
      allowPrivilegeEscalation: false,
      seccompProfile: { type: 'RuntimeDefault' },
      capabilities: { drop: ['ALL'] },
    },
  };
  if (options.command) {
    container.command = options.command;
  } else if (options.script !== undefined) {
    container.command = ['sh', '-c'];
  }
  if (options.caBundle) {
    container.env = [{ name: 'AWS_CA_BUNDLE', value: '/tmp/s3-ca/ca.pem' }];
    container.volumeMounts = [{ name: 's3-ca', mountPath: '/tmp/s3-ca', readOnly: true }];
  }

  return {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: { name: options.jobName, namespace: options.namespace, labels },
    spec: {
      backoffLimit: 0,
      activeDeadlineSeconds: Math.ceil(options.timeoutMs / 1000) + 120,
      ttlSecondsAfterFinished: AUTOML_RECOVERY_JOB_TTL_SECONDS,
      template: {
        metadata: { labels },
        spec: {
          restartPolicy: 'Never',
          containers: [container],
          ...(options.caBundle
            ? {
                volumes: [
                  {
                    name: 's3-ca',
                    secret: {
                      secretName: options.secretName,
                      items: [{ key: 'AWS_CA_BUNDLE_PEM', path: 'ca.pem' }],
                    },
                  },
                ],
              }
            : {}),
        },
      },
    },
  };
};

export const buildRecoverySecretOwnerReference = (
  jobName: string,
  jobUID: string,
): Record<string, unknown> => ({
  apiVersion: 'batch/v1',
  kind: 'Job',
  name: jobName,
  uid: jobUID,
  controller: true,
  blockOwnerDeletion: true,
});

export const isStaleUnownedRecoverySecret = (secret: unknown, now = Date.now()): boolean => {
  if (typeof secret !== 'object' || secret === null || !('metadata' in secret)) {
    return false;
  }
  const { metadata } = secret;
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }
  const ownerReferences = 'ownerReferences' in metadata ? metadata.ownerReferences : undefined;
  if (Array.isArray(ownerReferences) && ownerReferences.length > 0) {
    return false;
  }
  const createdAt = 'creationTimestamp' in metadata ? metadata.creationTimestamp : undefined;
  if (typeof createdAt !== 'string') {
    return false;
  }
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && now - timestamp >= AUTOML_RECOVERY_ORPHAN_AGE_MS;
};
