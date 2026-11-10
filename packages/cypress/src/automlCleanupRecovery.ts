export const AUTOML_RECOVERY_MANAGED_BY_LABEL = 'app.kubernetes.io/managed-by';
export const AUTOML_RECOVERY_MANAGED_BY = 'odh-dashboard-cypress-cleanup';
export const AUTOML_RECOVERY_RUN_ID_LABEL = 'odh-dashboard.io/automl-cleanup-run';
export const AUTOML_RECOVERY_ORPHAN_AGE_MS = 60 * 60 * 1000;
export const AUTOML_RECOVERY_JOB_TTL_SECONDS = 300;

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
  script: string;
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
  const labels = {
    [AUTOML_RECOVERY_MANAGED_BY_LABEL]: AUTOML_RECOVERY_MANAGED_BY,
    [AUTOML_RECOVERY_RUN_ID_LABEL]: options.jobName.replace('autox-s3-', ''),
  };
  const container: Record<string, unknown> = {
    name: options.jobName,
    image: options.image,
    command: ['sh', '-c'],
    args: [options.script],
    envFrom: [{ secretRef: { name: options.secretName } }],
    securityContext: {
      runAsUser: 1001,
      runAsGroup: 1001,
      runAsNonRoot: true,
      allowPrivilegeEscalation: false,
      seccompProfile: { type: 'RuntimeDefault' },
      capabilities: { drop: ['ALL'] },
    },
  };
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
