import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  createAutomlCleanupTasks,
  readAutomlCleanupManifest,
  writeAutomlCleanupManifest,
  type AutomlCleanupManifest,
} from '../automlCleanupManifest';

describe('AutoML cleanup manifest', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'automl-cleanup-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const validManifest = (): AutomlCleanupManifest => ({
    version: 1,
    spec: 'cypress/tests/e2e/automl/testAutoml.cy.ts',
    jobName: '3.6/automl-ui-tests',
    buildNumber: '22',
    createdAt: '2026-10-01T00:00:00.000Z',
    projects: [
      {
        namespace: 'automl-test-project',
        bucketKey: 'BUCKET_2',
        bucketName: 'automl-test-bucket',
        clusterServer: 'https://api.example.test:6443',
        uploads: ['datasets/input.csv'],
        runs: [{ id: 'run-123', outputRoot: 'autogluon-tabular-training-pipeline' }],
        s3Cleaned: false,
        projectDeleted: false,
        errors: [],
      },
    ],
  });

  it('reads valid manifests and rejects missing or incorrectly typed manifest and project fields', () => {
    const filePath = path.join(directory, 'manifest.json');
    writeAutomlCleanupManifest(filePath, validManifest());
    expect(readAutomlCleanupManifest(filePath)).toEqual(validManifest());

    const originalProject = validManifest().projects[0];
    const invalidManifests = [
      { ...validManifest(), buildNumber: undefined },
      { ...validManifest(), version: '1' },
      {
        ...validManifest(),
        projects: [{ ...originalProject, bucketKey: 'BUCKET_1' }],
      },
      {
        ...validManifest(),
        projects: [{ ...originalProject, clusterServer: undefined }],
      },
      {
        ...validManifest(),
        projects: [{ ...originalProject, uploads: 'datasets/input.csv' }],
      },
    ];
    for (const invalidManifest of invalidManifests) {
      fs.writeFileSync(filePath, JSON.stringify(invalidManifest));
      expect(() => readAutomlCleanupManifest(filePath)).toThrow('Invalid AutoML cleanup manifest');
    }
  });

  it('rejects malformed JSON', () => {
    const filePath = path.join(directory, 'manifest.json');
    fs.writeFileSync(filePath, '{ invalid json');
    expect(() => readAutomlCleanupManifest(filePath)).toThrow(SyntaxError);
  });

  it('records project uploads, runs, and cleanup status across manifest reads', () => {
    const tasks = createAutomlCleanupTasks(directory, '3.6/automl-ui-tests', '22');
    const projectRecord = {
      spec: 'automl.cy.ts',
      namespace: 'automl-test-project',
      bucketKey: 'BUCKET_2' as const,
      bucketName: 'automl-test-bucket',
      clusterServer: 'https://api.example.test:6443',
    };

    tasks['automlCleanup:recordProject'](projectRecord);
    tasks['automlCleanup:recordUpload']({
      spec: projectRecord.spec,
      namespace: projectRecord.namespace,
      key: 'datasets/input.csv',
    });
    tasks['automlCleanup:recordUpload']({
      spec: projectRecord.spec,
      namespace: projectRecord.namespace,
      key: 'datasets/input.csv',
    });
    tasks['automlCleanup:recordRun']({
      spec: projectRecord.spec,
      namespace: projectRecord.namespace,
      id: 'run-123',
      outputRoot: 'autogluon-tabular-training-pipeline',
    });
    tasks['automlCleanup:markProject']({
      spec: projectRecord.spec,
      namespace: projectRecord.namespace,
      s3Cleaned: true,
      projectDeleted: true,
      errors: [],
    });

    const manifest = tasks['automlCleanup:get'](projectRecord.spec);
    expect(manifest?.projects).toEqual([
      {
        namespace: projectRecord.namespace,
        bucketKey: projectRecord.bucketKey,
        bucketName: projectRecord.bucketName,
        clusterServer: projectRecord.clusterServer,
        uploads: ['datasets/input.csv'],
        runs: [{ id: 'run-123', outputRoot: 'autogluon-tabular-training-pipeline' }],
        s3Cleaned: true,
        projectDeleted: true,
        errors: [],
      },
    ]);
    expect(manifest?.jobName).toBe('3.6/automl-ui-tests');
    expect(manifest?.buildNumber).toBe('22');
  });
});
