import {
  assertModelVersionServed,
  getVersionSchema,
  kueueFixturePath,
  loadCrd,
  resolveSchemaPath,
  schemaEnumValues,
  schemaSupportsType,
} from '../testing/crdSchemaHelpers';
import {
  ClusterQueueModel,
  CohortModel,
  LocalQueueModel,
  ResourceFlavorModel,
  VisibilityLocalQueueModel,
  WorkloadModel,
  WorkloadPriorityClassModel,
} from '../api/models';
import { KUEUE_QUEUE_LABEL } from '../kueue/workloadStatus';

const KUEUE_VERSION = 'v1beta2';

const KUEUE_MODEL_FIXTURES = [
  { model: WorkloadPriorityClassModel, fixture: 'kueue.x-k8s.io_workloadpriorityclasses.yaml' },
  { model: CohortModel, fixture: 'kueue.x-k8s.io_cohorts.yaml' },
  { model: ResourceFlavorModel, fixture: 'kueue.x-k8s.io_resourceflavors.yaml' },
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
        kueueFixturePath('kueue.x-k8s.io_clusterqueues.yaml'),
        ClusterQueueModel.apiVersion,
        ClusterQueueModel.apiGroup,
      );
    });

    it('LocalQueueModel targets a served CRD version', () => {
      assertModelVersionServed(
        kueueFixturePath('kueue.x-k8s.io_localqueues.yaml'),
        LocalQueueModel.apiVersion,
        LocalQueueModel.apiGroup,
      );
    });

    it('WorkloadModel targets a served CRD version', () => {
      assertModelVersionServed(
        kueueFixturePath('kueue.x-k8s.io_workloads.yaml'),
        WorkloadModel.apiVersion,
        WorkloadModel.apiGroup,
      );
    });

    it.each(KUEUE_MODEL_FIXTURES)(
      '$model.kind targets a served CRD version',
      ({ model, fixture }) => {
        assertModelVersionServed(kueueFixturePath(fixture), model.apiVersion, model.apiGroup);
      },
    );

    it('VisibilityLocalQueueModel targets the visibility API group', () => {
      expect(VisibilityLocalQueueModel.apiGroup).toBe('visibility.kueue.x-k8s.io');
      expect(VisibilityLocalQueueModel.apiVersion).toBe('v1beta2');
      expect(VisibilityLocalQueueModel.kind).toBe('LocalQueue');
      expect(VisibilityLocalQueueModel.plural).toBe('localqueues');
    });

    it('VisibilityLocalQueueModel supports pendingworkloads subresource path', () => {
      const resourcePath = [
        'apis',
        VisibilityLocalQueueModel.apiGroup,
        VisibilityLocalQueueModel.apiVersion,
        'namespaces',
        'test-ns',
        VisibilityLocalQueueModel.plural,
        'test-queue',
        'pendingworkloads',
      ].join('/');

      expect(resourcePath).toBe(
        'apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/test-ns/localqueues/test-queue/pendingworkloads',
      );
    });
  });

  describe('WorkloadKind contract', () => {
    it('validates dashboard-used Workload spec/status fields against CRD schema', () => {
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_workloads.yaml'), [
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
        loadCrd(kueueFixturePath('kueue.x-k8s.io_workloads.yaml')),
        KUEUE_VERSION,
      );
      expect(resolveSchemaPath(schema, 'spec.priorityClassSource')).toBeUndefined();
      expect(resolveSchemaPath(schema, 'spec.priorityClassRef')).toBeDefined();
    });
  });

  describe('ClusterQueueKind contract', () => {
    it('validates dashboard-used ClusterQueue fields against CRD schema', () => {
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_clusterqueues.yaml'), [
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
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_localqueues.yaml'), [
        { path: 'spec.clusterQueue', type: 'string' },
        { path: 'status.conditions', type: 'array' },
        { path: 'status.pendingWorkloads', type: 'integer' },
        { path: 'status.admittedWorkloads', type: 'integer' },
      ]);
    });
  });

  describe('CohortKind contract', () => {
    it('validates dashboard-used Cohort fields against CRD schema', () => {
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_cohorts.yaml'), [
        { path: 'spec.parentName', type: 'string' },
        { path: 'spec.resourceGroups', type: 'array' },
        { path: 'spec.fairSharing', type: 'object' },
        { path: 'status.fairSharing', type: 'object' },
      ]);
    });
  });

  describe('ResourceFlavorKind contract', () => {
    it('validates dashboard-used ResourceFlavor fields against CRD schema', () => {
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_resourceflavors.yaml'), [
        { path: 'spec.nodeLabels', type: 'object' },
        { path: 'spec.nodeTaints', type: 'array' },
        { path: 'spec.tolerations', type: 'array' },
        { path: 'spec.topologyName', type: 'string' },
      ]);
    });
  });

  describe('WorkloadPriorityClassKind contract', () => {
    it('validates dashboard-used WorkloadPriorityClass fields against CRD schema', () => {
      assertFieldsExist(kueueFixturePath('kueue.x-k8s.io_workloadpriorityclasses.yaml'), [
        { path: 'value', type: 'integer' },
        { path: 'description', type: 'string' },
      ]);
    });
  });

  describe('Kueue queue label contract', () => {
    it('uses the canonical Kueue queue label key', () => {
      expect(KUEUE_QUEUE_LABEL).toBe('kueue.x-k8s.io/queue-name');
    });
  });
});
