import {
  fixturePath,
  getVersionSchema,
  loadCrd,
  resolveSchemaPath,
  schemaSupportsType,
} from '@odh-dashboard/k8s-core/__tests__/helpers/crdSchemaHelpers';

const TRAIN_JOB_MODEL = {
  apiVersion: 'v1alpha1',
  apiGroup: 'trainer.kubeflow.org',
  kind: 'TrainJob',
} as const;

const TRAINER_VERSION = 'v1alpha1';

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
  describe('TrainJobKind contract', () => {
    it('TrainJobModel targets a served CRD version', () => {
      const crd = loadCrd(fixturePath('trainer.kubeflow.org_trainjobs.yaml'));
      const version = crd.spec.versions.find((entry) => entry.name === TRAIN_JOB_MODEL.apiVersion);
      expect(version?.served).toBe(true);
      expect(crd.spec.group).toBe(TRAIN_JOB_MODEL.apiGroup);
      expect(crd.spec.names.kind).toBe(TRAIN_JOB_MODEL.kind);
    });

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
  });

  describe('ClusterTrainingRuntimeKind contract', () => {
    it('validates dashboard-used ClusterTrainingRuntime fields against CRD schema', () => {
      assertFieldsExist(fixturePath('trainer.kubeflow.org_clustertrainingruntimes.yaml'), [
        { path: 'spec.mlPolicy', type: 'object' },
        { path: 'spec.mlPolicy.numNodes', type: 'integer' },
        { path: 'spec.mlPolicy.torch', type: 'object' },
        { path: 'spec.template', type: 'object' },
        { path: 'spec.template.spec', type: 'object' },
        { path: 'spec.template.spec.replicatedJobs', type: 'array' },
      ]);
    });
  });
});
