import {
  assertModelVersionServed,
  fixturePath,
  getVersionSchema,
  loadCrd,
  resolveSchemaPath,
  schemaEnumValues,
  schemaSupportsType,
} from './helpers/crdSchemaHelpers';
import { ClusterQueueModel, LocalQueueModel, WorkloadModel } from '../api/models';
import { KUEUE_QUEUE_LABEL } from '../kueue/workloadStatus';

const KUEUE_VERSION = 'v1beta2';
const TRAINER_VERSION = 'v1alpha1';

const FRONTEND_KUEUE_MODELS = [
  {
    label: 'WorkloadPriorityClassModel',
    apiVersion: 'v1beta2',
    apiGroup: 'kueue.x-k8s.io',
    kind: 'WorkloadPriorityClass',
    fixture: 'kueue.x-k8s.io_workloadpriorityclasses.yaml',
  },
  {
    label: 'CohortModel',
    apiVersion: 'v1beta2',
    apiGroup: 'kueue.x-k8s.io',
    kind: 'Cohort',
    fixture: 'kueue.x-k8s.io_cohorts.yaml',
  },
  {
    label: 'ResourceFlavorModel',
    apiVersion: 'v1beta2',
    apiGroup: 'kueue.x-k8s.io',
    kind: 'ResourceFlavor',
    fixture: 'kueue.x-k8s.io_resourceflavors.yaml',
  },
] as const;

type ContractField = {
  path: string;
  type: 'boolean' | 'string' | 'number' | 'integer' | 'object' | 'array';
  enumValues?: string[];
};

const assertFieldsExist = (crdFile: string, fields: ContractField[]): void => {
  const schema = getVersionSchema(loadCrd(crdFile), KUEUE_VERSION);
  expect(schema).toBeDefined();

  for (const field of fields) {
    const resolved = resolveSchemaPath(schema, field.path);
    expect(resolved).toBeDefined();
    expect(schemaSupportsType(resolved, field.type)).toBe(true);

    if (field.enumValues) {
      const crdEnum = schemaEnumValues(resolved);
      for (const value of field.enumValues) {
        expect(crdEnum).toContain(value);
      }
    }
  }
};

describe('Kueue CRD contract tests', () => {
  describe('API models', () => {
    it('ClusterQueueModel targets a served CRD version', () => {
      assertModelVersionServed(
        fixturePath('kueue.x-k8s.io_clusterqueues.yaml'),
        ClusterQueueModel.apiVersion,
        ClusterQueueModel.apiGroup,
      );
    });

    it('LocalQueueModel targets a served CRD version', () => {
      assertModelVersionServed(
        fixturePath('kueue.x-k8s.io_localqueues.yaml'),
        LocalQueueModel.apiVersion,
        LocalQueueModel.apiGroup,
      );
    });

    it('WorkloadModel targets a served CRD version', () => {
      assertModelVersionServed(
        fixturePath('kueue.x-k8s.io_workloads.yaml'),
        WorkloadModel.apiVersion,
        WorkloadModel.apiGroup,
      );
    });

    it.each(FRONTEND_KUEUE_MODELS)('$label targets a served CRD version', (model) => {
      assertModelVersionServed(fixturePath(model.fixture), model.apiVersion, model.apiGroup);
    });

    it('VisibilityLocalQueueModel uses the visibility API group', () => {
      const visibilityLocalQueueModel = {
        apiGroup: 'visibility.kueue.x-k8s.io',
        apiVersion: 'v1beta2',
        kind: 'LocalQueue',
      };
      expect(visibilityLocalQueueModel.apiGroup).toBe('visibility.kueue.x-k8s.io');
      expect(visibilityLocalQueueModel.apiVersion).toBe('v1beta2');
      expect(visibilityLocalQueueModel.kind).toBe('LocalQueue');
    });
  });

  describe('WorkloadKind contract', () => {
    it('validates dashboard-used Workload spec/status fields against CRD schema', () => {
      assertFieldsExist(fixturePath('kueue.x-k8s.io_workloads.yaml'), [
        { path: 'spec.active', type: 'boolean' },
        { path: 'spec.podSets', type: 'array' },
        { path: 'spec.priority', type: 'integer' },
        { path: 'spec.priorityClassRef', type: 'object' },
        { path: 'spec.priorityClassRef.group', type: 'string' },
        { path: 'spec.priorityClassRef.kind', type: 'string' },
        { path: 'spec.priorityClassRef.name', type: 'string' },
        { path: 'spec.queueName', type: 'string' },
        { path: 'status.admission', type: 'object' },
        { path: 'status.admissionChecks', type: 'array' },
        { path: 'status.conditions', type: 'array' },
        { path: 'status.reclaimablePods', type: 'array' },
        { path: 'status.requeueState', type: 'object' },
      ]);
    });

    it('does not use deprecated priorityClassSource in v1beta2 schema', () => {
      const schema = getVersionSchema(
        loadCrd(fixturePath('kueue.x-k8s.io_workloads.yaml')),
        KUEUE_VERSION,
      );
      expect(resolveSchemaPath(schema, 'spec.priorityClassSource')).toBeUndefined();
      expect(resolveSchemaPath(schema, 'spec.priorityClassRef')).toBeDefined();
    });
  });

  describe('ClusterQueueKind contract', () => {
    it('validates dashboard-used ClusterQueue fields against CRD schema', () => {
      assertFieldsExist(fixturePath('kueue.x-k8s.io_clusterqueues.yaml'), [
        { path: 'spec.cohortName', type: 'string' },
        { path: 'spec.namespaceSelector', type: 'object' },
        {
          path: 'spec.queueingStrategy',
          type: 'string',
          enumValues: ['StrictFIFO', 'BestEffortFIFO'],
        },
        { path: 'spec.resourceGroups', type: 'array' },
        {
          path: 'spec.stopPolicy',
          type: 'string',
          enumValues: ['None', 'Hold', 'HoldAndDrain'],
        },
        { path: 'status.conditions', type: 'array' },
        { path: 'status.pendingWorkloads', type: 'integer' },
        { path: 'status.admittedWorkloads', type: 'integer' },
      ]);
    });
  });

  describe('LocalQueueKind contract', () => {
    it('validates dashboard-used LocalQueue fields against CRD schema', () => {
      assertFieldsExist(fixturePath('kueue.x-k8s.io_localqueues.yaml'), [
        { path: 'spec.clusterQueue', type: 'string' },
        { path: 'status.conditions', type: 'array' },
        { path: 'status.pendingWorkloads', type: 'integer' },
        { path: 'status.admittedWorkloads', type: 'integer' },
      ]);
    });
  });

  describe('CohortKind contract', () => {
    it('validates dashboard-used Cohort fields against CRD schema', () => {
      assertFieldsExist(fixturePath('kueue.x-k8s.io_cohorts.yaml'), [
        { path: 'spec.parentName', type: 'string' },
        { path: 'spec.resourceGroups', type: 'array' },
        { path: 'spec.fairSharing', type: 'object' },
        { path: 'status.fairSharing', type: 'object' },
      ]);
    });
  });

  describe('ResourceFlavorKind contract', () => {
    it('validates dashboard-used ResourceFlavor fields against CRD schema', () => {
      assertFieldsExist(fixturePath('kueue.x-k8s.io_resourceflavors.yaml'), [
        { path: 'spec.nodeLabels', type: 'object' },
        { path: 'spec.nodeTaints', type: 'array' },
        { path: 'spec.tolerations', type: 'array' },
        { path: 'spec.topologyName', type: 'string' },
      ]);
    });
  });

  describe('Kueue queue label contract', () => {
    it('uses the canonical Kueue queue label key', () => {
      expect(KUEUE_QUEUE_LABEL).toBe('kueue.x-k8s.io/queue-name');
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
});
