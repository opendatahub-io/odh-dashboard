import { describe, expect, it } from '@jest/globals';
import {
  assertAutomlCleanupTarget,
  AUTOML_RECOVERY_JOB_TTL_SECONDS,
  AUTOML_RECOVERY_ORPHAN_AGE_MS,
  buildRecoveryJobManifest,
  buildRecoverySecretManifest,
  buildRecoverySecretOwnerReference,
  isAutomlCleanupComplete,
  isStaleUnownedRecoverySecret,
} from '../automlCleanupRecovery';

describe('AutoML cleanup recovery resources', () => {
  it('skips only projects whose S3 cleanup and project deletion are both complete', () => {
    expect(isAutomlCleanupComplete({ projectDeleted: true, s3Cleaned: true })).toBe(true);
    expect(isAutomlCleanupComplete({ projectDeleted: true, s3Cleaned: false })).toBe(false);
    expect(isAutomlCleanupComplete({ projectDeleted: false, s3Cleaned: true })).toBe(false);
  });

  it('requires the recorded cluster, bucket, and S3 endpoint to match the recovery target', () => {
    const project = {
      namespace: 'cy-e2e-automl-run-1',
      clusterServer: 'https://api.example.test:6443',
      bucketName: 'automl-test-bucket',
      uploads: ['datasets/input.csv'],
      runs: [],
      s3Cleaned: false,
      s3Endpoint: 'https://s3.example.test',
    };

    expect(() =>
      assertAutomlCleanupTarget(project, 'https://api.example.test:6443', 'automl-test-bucket', [
        'https://s3.example.test',
      ]),
    ).not.toThrow();
    expect(() =>
      assertAutomlCleanupTarget(project, 'https://other.example.test:6443', 'automl-test-bucket', [
        'https://s3.example.test',
      ]),
    ).toThrow('Cluster mismatch');
    expect(() =>
      assertAutomlCleanupTarget(project, 'https://api.example.test:6443', 'other-bucket', [
        'https://s3.example.test',
      ]),
    ).toThrow('S3 bucket mismatch');
    expect(() =>
      assertAutomlCleanupTarget(
        { ...project, s3Endpoint: undefined },
        project.clusterServer,
        project.bucketName,
        ['https://s3.example.test'],
      ),
    ).toThrow('Recorded S3 endpoint is missing or invalid');
    expect(() =>
      assertAutomlCleanupTarget(
        { ...project, s3Endpoint: '' },
        project.clusterServer,
        project.bucketName,
        ['https://s3.example.test'],
      ),
    ).toThrow('Recorded S3 endpoint is missing or invalid');
    expect(() =>
      assertAutomlCleanupTarget(
        { ...project, s3Endpoint: '  ' },
        project.clusterServer,
        project.bucketName,
        ['https://s3.example.test'],
      ),
    ).toThrow('Recorded S3 endpoint is missing or invalid');
    expect(() =>
      assertAutomlCleanupTarget(
        { ...project, s3Endpoint: 'https://other.example.test' },
        project.clusterServer,
        project.bucketName,
        ['https://s3.example.test'],
      ),
    ).toThrow('does not match the configured bucket endpoint');
    expect(() =>
      assertAutomlCleanupTarget(
        { ...project, s3Endpoint: 'file:///tmp/credentials' },
        project.clusterServer,
        project.bucketName,
        ['file:///tmp/credentials'],
      ),
    ).toThrow('Recorded S3 endpoint is missing or invalid');
  });

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
      template: {
        spec: {
          restartPolicy: string;
          containers: {
            envFrom: unknown[];
            securityContext: Record<string, unknown>;
          }[];
        };
      };
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
          containers: [{ envFrom: [{ secretRef: { name: 'autox-s3-a1b2c3d4e5f60708-creds' } }] }],
        },
      },
    });
    expect(spec.template.spec.containers[0].securityContext).toMatchObject({
      runAsNonRoot: true,
      runAsGroup: 1001,
      allowPrivilegeEscalation: false,
    });
    expect(spec.template.spec.containers[0].securityContext).not.toHaveProperty('runAsUser');
    expect(job).not.toHaveProperty('spec.template.spec.serviceAccountName');
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
