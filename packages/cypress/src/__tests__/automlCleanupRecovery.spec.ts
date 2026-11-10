import { describe, expect, it } from '@jest/globals';
import {
  AUTOML_RECOVERY_JOB_TTL_SECONDS,
  AUTOML_RECOVERY_ORPHAN_AGE_MS,
  buildRecoveryJobManifest,
  buildRecoverySecretManifest,
  buildRecoverySecretOwnerReference,
  isStaleUnownedRecoverySecret,
} from '../automlCleanupRecovery';

describe('AutoML cleanup recovery resources', () => {
  it('creates a labeled credential Secret and TTL-managed Job with an active deadline', () => {
    const secret = buildRecoverySecretManifest(
      'stable-cleanup',
      'autox-s3-a1b2c3d4e5f60708-creds',
      'a1b2c3d4e5f60708',
      {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        region: 'us-east-1',
      },
    );
    const job = buildRecoveryJobManifest({
      namespace: 'stable-cleanup',
      jobName: 'autox-s3-a1b2c3d4e5f60708',
      secretName: 'autox-s3-a1b2c3d4e5f60708-creds',
      image: 'amazon/aws-cli:2',
      script: 'aws s3api list-buckets',
      timeoutMs: 900000,
    });
    const spec = job.spec as {
      ttlSecondsAfterFinished: number;
      activeDeadlineSeconds: number;
      backoffLimit: number;
      template: { spec: { restartPolicy: string; containers: { envFrom: unknown[] }[] } };
    };

    expect(secret).toMatchObject({
      kind: 'Secret',
      metadata: {
        labels: {
          'app.kubernetes.io/managed-by': 'odh-dashboard-cypress-cleanup',
          'odh-dashboard.io/automl-cleanup-run': 'a1b2c3d4e5f60708',
        },
      },
    });
    expect(spec).toMatchObject({
      ttlSecondsAfterFinished: AUTOML_RECOVERY_JOB_TTL_SECONDS,
      activeDeadlineSeconds: 1020,
      backoffLimit: 0,
      template: {
        spec: {
          restartPolicy: 'Never',
          containers: [
            { envFrom: [{ secretRef: { name: 'autox-s3-a1b2c3d4e5f60708-creds' } }] },
          ],
        },
      },
    });
    expect(
      buildRecoverySecretOwnerReference('autox-s3-a1b2c3d4e5f60708', 'job-uid-123'),
    ).toMatchObject({ kind: 'Job', name: 'autox-s3-a1b2c3d4e5f60708', uid: 'job-uid-123' });
  });

  it('only treats old unowned recovery Secrets as sweep candidates', () => {
    const oldTimestamp = new Date(Date.now() - AUTOML_RECOVERY_ORPHAN_AGE_MS - 1000).toISOString();
    const staleSecret = { metadata: { creationTimestamp: oldTimestamp } };

    expect(isStaleUnownedRecoverySecret(staleSecret)).toBe(true);
    expect(
      isStaleUnownedRecoverySecret({
        metadata: { creationTimestamp: oldTimestamp, ownerReferences: [{ kind: 'Job' }] },
      }),
    ).toBe(false);
    expect(
      isStaleUnownedRecoverySecret({
        metadata: { creationTimestamp: new Date().toISOString() },
      }),
    ).toBe(false);
  });
});
