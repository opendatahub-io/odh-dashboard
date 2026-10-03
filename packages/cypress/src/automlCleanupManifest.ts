import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';

export type AutomlOutputRoot =
  | 'autogluon-tabular-training-pipeline'
  | 'autogluon-timeseries-training-pipeline';

export type AutomlCleanupProject = {
  namespace: string;
  bucketKey: 'BUCKET_2' | 'BUCKET_3';
  bucketName: string;
  clusterServer: string;
  uploads: string[];
  runs: { id: string; outputRoot: AutomlOutputRoot }[];
  s3Cleaned: boolean;
  projectDeleted: boolean;
  errors: string[];
};

export type AutomlCleanupManifest = {
  version: 1;
  spec: string;
  jobName: string;
  buildNumber: string;
  createdAt: string;
  projects: AutomlCleanupProject[];
};

type RecordProject = {
  spec: string;
  namespace: string;
  bucketKey: AutomlCleanupProject['bucketKey'];
  bucketName: string;
  clusterServer: string;
};

type RecordUpload = Pick<RecordProject, 'spec' | 'namespace'> & { key: string };

type RecordRun = Pick<RecordProject, 'spec' | 'namespace'> & {
  id: string;
  outputRoot: AutomlOutputRoot;
};

type MarkProject = Pick<RecordProject, 'spec' | 'namespace'> & {
  s3Cleaned: boolean;
  projectDeleted: boolean;
  errors: string[];
};

type AutomlCleanupTasks = {
  'automlCleanup:get': (spec: string) => AutomlCleanupManifest | null;
  'automlCleanup:recordProject': (record: RecordProject) => AutomlCleanupManifest;
  'automlCleanup:recordUpload': (record: RecordUpload) => AutomlCleanupManifest;
  'automlCleanup:recordRun': (record: RecordRun) => AutomlCleanupManifest;
  'automlCleanup:markProject': (record: MarkProject) => AutomlCleanupManifest;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isProject = (value: unknown): value is AutomlCleanupProject => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.namespace === 'string' &&
    (value.bucketKey === 'BUCKET_2' || value.bucketKey === 'BUCKET_3') &&
    typeof value.bucketName === 'string' &&
    typeof value.clusterServer === 'string' &&
    Array.isArray(value.uploads) &&
    value.uploads.every((key: unknown) => typeof key === 'string') &&
    Array.isArray(value.runs) &&
    value.runs.every(
      (run: unknown) =>
        isRecord(run) &&
        typeof run.id === 'string' &&
        (run.outputRoot === 'autogluon-tabular-training-pipeline' ||
          run.outputRoot === 'autogluon-timeseries-training-pipeline'),
    ) &&
    typeof value.s3Cleaned === 'boolean' &&
    typeof value.projectDeleted === 'boolean' &&
    Array.isArray(value.errors) &&
    value.errors.every((error: unknown) => typeof error === 'string')
  );
};

const isManifest = (value: unknown): value is AutomlCleanupManifest =>
  isRecord(value) &&
  value.version === 1 &&
  typeof value.spec === 'string' &&
  typeof value.jobName === 'string' &&
  typeof value.buildNumber === 'string' &&
  typeof value.createdAt === 'string' &&
  Array.isArray(value.projects) &&
  value.projects.every(isProject);

const requireProject = (
  manifest: AutomlCleanupManifest,
  namespace: string,
): AutomlCleanupProject => {
  const project = manifest.projects.find((item) => item.namespace === namespace);
  if (!project) {
    throw new Error(`AutoML cleanup project ${namespace} was not recorded`);
  }
  return project;
};

export const readAutomlCleanupManifest = (filePath: string): AutomlCleanupManifest => {
  const manifest: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!isManifest(manifest)) {
    throw new Error(`Invalid AutoML cleanup manifest: ${filePath}`);
  }
  return manifest;
};

export const writeAutomlCleanupManifest = (
  filePath: string,
  manifest: AutomlCleanupManifest,
): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
};

/** A per-Cypress-process directory keeps concurrent jobs and retries from sharing a manifest. */
export const createAutomlCleanupTasks = (
  resultsDirectory: string,
  jobName: string,
  buildNumber: string,
): AutomlCleanupTasks => {
  const directory = path.join(resultsDirectory, 'automl-cleanup', randomUUID());
  const manifestPath = (spec: string): string => {
    const digest = createHash('sha256').update(spec).digest('hex').slice(0, 16);
    return path.join(directory, `${digest}.json`);
  };
  const read = (spec: string): AutomlCleanupManifest | null => {
    const filePath = manifestPath(spec);
    return fs.existsSync(filePath) ? readAutomlCleanupManifest(filePath) : null;
  };
  const update = (
    spec: string,
    change: (manifest: AutomlCleanupManifest) => void,
  ): AutomlCleanupManifest => {
    const filePath = manifestPath(spec);
    const manifest = read(spec) ?? {
      version: 1,
      spec,
      jobName,
      buildNumber,
      createdAt: new Date().toISOString(),
      projects: [],
    };
    change(manifest);
    writeAutomlCleanupManifest(filePath, manifest);
    return manifest;
  };

  return {
    'automlCleanup:get': (spec: string) => read(spec),
    'automlCleanup:recordProject': ({
      spec,
      namespace,
      bucketKey,
      bucketName,
      clusterServer,
    }: RecordProject) =>
      update(spec, (manifest) => {
        if (!manifest.projects.some((project) => project.namespace === namespace)) {
          manifest.projects.push({
            namespace,
            bucketKey,
            bucketName,
            clusterServer,
            uploads: [],
            runs: [],
            s3Cleaned: false,
            projectDeleted: false,
            errors: [],
          });
        }
      }),
    'automlCleanup:recordUpload': ({ spec, namespace, key }: RecordUpload) =>
      update(spec, (manifest) => {
        const project = requireProject(manifest, namespace);
        if (!project.uploads.includes(key)) {
          project.uploads.push(key);
        }
        project.s3Cleaned = false;
      }),
    'automlCleanup:recordRun': ({ spec, namespace, id, outputRoot }: RecordRun) =>
      update(spec, (manifest) => {
        const project = requireProject(manifest, namespace);
        if (!project.runs.some((run) => run.id === id)) {
          project.runs.push({ id, outputRoot });
        }
        project.s3Cleaned = false;
      }),
    'automlCleanup:markProject': ({
      spec,
      namespace,
      s3Cleaned,
      projectDeleted,
      errors,
    }: MarkProject) =>
      update(spec, (manifest) => {
        const project = requireProject(manifest, namespace);
        project.s3Cleaned = s3Cleaned;
        project.projectDeleted = projectDeleted;
        project.errors = errors;
      }),
  };
};
