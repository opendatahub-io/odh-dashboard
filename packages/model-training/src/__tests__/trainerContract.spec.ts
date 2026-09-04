import path from 'path';

import {
  assertModelVersionServed,
  getVersionSchema,
  loadCrd,
  resolveSchemaPath,
  schemaSupportsType,
} from '@odh-dashboard/k8s-core/__tests__/helpers/crdSchemaHelpers';

const TRAINER_VERSION = 'v1alpha1';
const TRAINER_API_GROUP = 'trainer.kubeflow.org';

const TRAIN_JOB_MODEL = {
  apiGroup: TRAINER_API_GROUP,
  apiVersion: 'v1alpha1',
  kind: 'TrainJob',
} as const;

const fixturePath = (...segments: string[]): string =>
  path.join(__dirname, 'fixtures', 'trainer-crds', ...segments);

type ContractField = {
  path: string;
  type: 'boolean' | 'string' | 'number' | 'integer' | 'object' | 'array';
};

const assertFieldsExist = (crdFile: string, fields: ContractField[]): void => {
  const schema = getVersionSchema(loadCrd(crdFile), TRAINER_VERSION);
  expect(schema).toBeDefined();

  for (const field of fields) {
    const resolved = resolveSchemaPath(schema, field.path);
    expect(resolved).toBeDefined();
    expect(schemaSupportsType(resolved, field.type)).toBe(true);
  }
};

describe('Trainer CRD contract tests', () => {
  describe('API models', () => {
    it('TrainJob model targets a served CRD version', () => {
      assertModelVersionServed(
        fixturePath('trainer.kubeflow.org_trainjobs.yaml'),
        TRAIN_JOB_MODEL.apiVersion,
        TRAIN_JOB_MODEL.apiGroup,
      );
    });

    it('ClusterTrainingRuntime targets a served CRD version', () => {
      assertModelVersionServed(
        fixturePath('trainer.kubeflow.org_clustertrainingruntimes.yaml'),
        TRAINER_VERSION,
        TRAINER_API_GROUP,
      );
    });
  });

  describe('TrainJobKind contract', () => {
    it('validates dashboard-used TrainJob fields against CRD schema', () => {
      assertFieldsExist(fixturePath('trainer.kubeflow.org_trainjobs.yaml'), [
        { path: 'spec.runtimeRef', type: 'object' },
        { path: 'spec.runtimeRef.apiGroup', type: 'string' },
        { path: 'spec.runtimeRef.kind', type: 'string' },
        { path: 'spec.runtimeRef.name', type: 'string' },
        { path: 'spec.suspend', type: 'boolean' },
        { path: 'spec.trainer', type: 'object' },
        { path: 'spec.trainer.numNodes', type: 'integer' },
        { path: 'spec.trainer.numProcPerNode', type: 'integer' },
        { path: 'spec.trainer.resourcesPerNode', type: 'object' },
        { path: 'status.conditions', type: 'array' },
        { path: 'status.jobsStatus', type: 'array' },
      ]);
    });

    it('TrainJob CRD exposes metadata object for queue labels', () => {
      const schema = getVersionSchema(
        loadCrd(fixturePath('trainer.kubeflow.org_trainjobs.yaml')),
        TRAINER_VERSION,
      );
      const metadataSchema = resolveSchemaPath(schema, 'metadata');
      expect(metadataSchema).toBeDefined();
      expect(schemaSupportsType(metadataSchema, 'object')).toBe(true);
    });
  });

  describe('ClusterTrainingRuntimeKind contract', () => {
    it('validates dashboard-used ClusterTrainingRuntime fields against CRD schema', () => {
      assertFieldsExist(fixturePath('trainer.kubeflow.org_clustertrainingruntimes.yaml'), [
        { path: 'spec.mlPolicy', type: 'object' },
        { path: 'spec.template', type: 'object' },
        { path: 'spec.template.spec', type: 'object' },
        { path: 'spec.template.spec.replicatedJobs', type: 'array' },
      ]);
    });
  });
});
