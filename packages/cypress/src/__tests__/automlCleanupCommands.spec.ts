import { describe, expect, it } from '@jest/globals';
import {
  assertAutomlCleanupProject,
  buildAutoXProjectManifest,
  buildAutomlS3CleanupScript,
  getAutoXCleanupActions,
  isValidAutoXS3Endpoint,
  shellQuote,
} from '../automlCleanupCommands';
import type { AutomlCleanupProject } from '../automlCleanupManifest';
import type { AWSS3BucketDetails } from '../../cypress/types';

const project = (overrides: Partial<AutomlCleanupProject> = {}): AutomlCleanupProject => ({
  namespace: 'automl-test-project',
  bucketKey: 'BUCKET_2',
  bucketName: 'automl-test-bucket',
  clusterServer: 'https://api.example.test:6443',
  uploads: ['datasets/input.csv'],
  runs: [{ id: 'run-123', outputRoot: 'autogluon-tabular-training-pipeline' }],
  s3Cleaned: false,
  projectDeleted: false,
  errors: [],
  ...overrides,
});

describe('AutoML cleanup commands', () => {
  it('creates AutoX projects with the cleanup token and dashboard label at creation', () => {
    expect(buildAutoXProjectManifest('cy-e2e-automl-123-1', 'attempt-token')).toEqual({
      apiVersion: 'project.openshift.io/v1',
      kind: 'Project',
      metadata: {
        name: 'cy-e2e-automl-123-1',
        labels: {
          'opendatahub.io/dashboard': 'true',
          'odh-dashboard.io/autox-cleanup-token': 'attempt-token',
        },
      },
    });
    expect(() => buildAutoXProjectManifest('invalid namespace', 'attempt-token')).toThrow(
      'Invalid AutoX project name',
    );
  });

  it('accepts only HTTP(S) S3 endpoints without credentials, queries, or fragments', () => {
    expect(isValidAutoXS3Endpoint('http://minio.internal.test:9000')).toBe(true);
    expect(isValidAutoXS3Endpoint('https://s3.example.test')).toBe(true);
    expect(isValidAutoXS3Endpoint('file:///tmp/credentials')).toBe(false);
    expect(isValidAutoXS3Endpoint('https://user:pass@s3.example.test')).toBe(false);
    expect(isValidAutoXS3Endpoint('https://s3.example.test/?token=x')).toBe(false);
    expect(isValidAutoXS3Endpoint(' https://s3.example.test')).toBe(false);
  });

  it('quotes shell arguments, including empty values, quotes, backslashes, and newlines', () => {
    expect(shellQuote('')).toBe("''");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
    expect(shellQuote('path\\to\nfile')).toBe("'path\\to\nfile'");
  });

  it('validates the recorded namespace, uploaded keys, run IDs, and output roots', () => {
    expect(() => assertAutomlCleanupProject(project())).not.toThrow();
    expect(() => assertAutomlCleanupProject(project({ namespace: 'Bad Namespace' }))).toThrow(
      'Invalid AutoML cleanup namespace',
    );
    expect(() => assertAutomlCleanupProject(project({ uploads: ['../secret'] }))).toThrow(
      'Invalid AutoML uploaded key',
    );
    expect(() =>
      assertAutomlCleanupProject(project({ s3Endpoint: 'https://user:pass@s3.example.test' })),
    ).toThrow('Invalid AutoML S3 endpoint');
    expect(() =>
      assertAutomlCleanupProject(
        project({
          runs: [{ id: 'bad/id', outputRoot: 'autogluon-tabular-training-pipeline' }],
        }),
      ),
    ).toThrow('Invalid AutoML run ID');
    expect(() =>
      assertAutomlCleanupProject(
        project({
          runs: [
            {
              id: 'run-123',
              outputRoot: 'other-output' as AutomlCleanupProject['runs'][number]['outputRoot'],
            },
          ],
        }),
      ),
    ).toThrow('Invalid AutoML output root');
  });

  it('generates exact-key and run-prefix cleanup commands with quoted S3 configuration', () => {
    const bucket: AWSS3BucketDetails = {
      NAME: 'automl-test-bucket',
      REGION: 'us-east-1',
      ENDPOINT: "https://s3.example.test/path?query=it's&b=c",
    };
    const cleanupProject = project();
    const script = buildAutomlS3CleanupScript(bucket, cleanupProject);

    expect(script).toContain(
      "aws --region 'us-east-1' --endpoint-url 'https://s3.example.test/path?query=it'\\''s&b=c'",
    );
    expect(script).toContain(
      "s3api delete-object --bucket 'automl-test-bucket' --key 'datasets/input.csv'",
    );
    expect(script).toContain("--prefix 'datasets/input.csv' --max-keys 1");
    expect(script).toContain(
      's3://automl-test-bucket/autogluon-tabular-training-pipeline/run-123/',
    );
    expect(script).toContain('exit "$failed"');
  });

  it('retains an owned project and skips S3 cleanup until recorded runs are terminal', () => {
    const cleanupProject = project();
    const actions = getAutoXCleanupActions(cleanupProject, {
      runsTerminal: false,
      namespaceExists: true,
      owned: true,
      inspectionFailed: false,
      namespaceUID: 'namespace-uid',
    });

    expect(actions).toEqual({ canCleanS3: false, projectDeletion: 'retain' });
  });

  it('allows S3 cleanup and project deletion only for a terminal, owned namespace', () => {
    expect(
      getAutoXCleanupActions(project(), {
        runsTerminal: true,
        namespaceExists: true,
        owned: true,
        inspectionFailed: false,
        namespaceUID: 'namespace-uid',
      }),
    ).toEqual({ canCleanS3: true, projectDeletion: 'delete' });

    expect(
      getAutoXCleanupActions(project(), {
        runsTerminal: true,
        namespaceExists: true,
        owned: false,
        inspectionFailed: false,
        namespaceUID: 'replacement-uid',
      }),
    ).toEqual({ canCleanS3: false, projectDeletion: 'retain' });
  });

  it('does not clean S3 or delete a project when namespace inspection fails', () => {
    expect(
      getAutoXCleanupActions(project(), {
        runsTerminal: false,
        namespaceExists: false,
        owned: false,
        inspectionFailed: true,
      }),
    ).toEqual({ canCleanS3: false, projectDeletion: 'retain' });
  });

  it('uses the recorded endpoint instead of the current bucket override', () => {
    const bucket: AWSS3BucketDetails = {
      NAME: 'automl-test-bucket',
      REGION: 'us-east-1',
      ENDPOINT: 'https://external-s3.example.test',
    };
    const script = buildAutomlS3CleanupScript(
      bucket,
      project({ s3Endpoint: 'http://minio.internal.test:9000' }),
    );

    expect(script).toContain("--endpoint-url 'http://minio.internal.test:9000'");
    expect(script).not.toContain('external-s3.example.test');
  });

  it('rejects a bucket that does not match the recorded project', () => {
    expect(() =>
      buildAutomlS3CleanupScript(
        { NAME: 'different-bucket', REGION: 'us-east-1', ENDPOINT: '' },
        project(),
      ),
    ).toThrow('does not match the recorded bucket');
  });
});
