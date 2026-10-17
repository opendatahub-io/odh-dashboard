import { describe, expect, it } from '@jest/globals';
import {
  assertAutomlCleanupProject,
  buildAutomlS3CleanupScript,
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

  it('rejects a bucket that does not match the recorded project', () => {
    expect(() =>
      buildAutomlS3CleanupScript(
        { NAME: 'different-bucket', REGION: 'us-east-1', ENDPOINT: '' },
        project(),
      ),
    ).toThrow('does not match the recorded bucket');
  });
});
