/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { JobSetModel, WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { TrainJobModel } from '@odh-dashboard/internal/api/models';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { projectName, initIntercepts } from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { modelTrainingGlobal, trainingJobTable } from '../../../pages/modelTraining';

// --- Mock data ---

const TRAIN_JOB_NAME = 'inadmissible-gpu-job';
const TRAIN_JOB_UID = 'trainjob-uid-aaaa-bbbb';
// The Training Operator creates the JobSet with the same name as the TrainJob.
// This uid is the only link to the Workload: it appears both on the JobSet stub and
// on the Workload ownerReference, so a matching uid is what proves ownership.
const TRAIN_JOBSET_UID = 'jobset-uid-cccc-dddd';

const mockInadmissibleTrainJobs = mockTrainJobK8sResourceList([
  {
    name: TRAIN_JOB_NAME,
    namespace: projectName,
    status: TrainingJobState.CREATED,
    numNodes: 2,
    localQueueName: 'training-queue',
    creationTimestamp: '2025-01-15T10:00:00Z',
    jobsStatus: [],
  },
]);
mockInadmissibleTrainJobs[0].metadata.uid = TRAIN_JOB_UID;

const mockInadmissibleWorkload = (() => {
  const base = mockWorkloadK8sResource({
    k8sName: `jobset-${TRAIN_JOB_NAME}-abcde`,
    namespace: projectName,
    mockStatus: WorkloadStatusType.Inadmissible,
  });
  return {
    ...base,
    metadata: {
      ...base.metadata,
      labels: {
        ...(base.metadata?.labels ?? {}),
        'kueue.x-k8s.io/job-uid': TRAIN_JOBSET_UID,
      },
      ownerReferences: [
        {
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          name: TRAIN_JOB_NAME,
          uid: TRAIN_JOBSET_UID,
        },
      ],
    },
    status: {
      ...base.status,
      conditions: [
        {
          type: 'QuotaReserved',
          status: 'False',
          reason: 'Pending',
          message:
            "couldn't assign flavors to pod set trainer: insufficient unused quota for " +
            'nvidia.com/gpu in flavor default-flavor, 2 > maximum capacity 0',
          lastTransitionTime: '2025-01-15T10:01:00Z',
        },
      ],
    },
  };
})();

// --- Test suite ---

describe('Training Job Inadmissible status with JobSet UID', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  const setupIntercepts = (): void => {
    initIntercepts();

    // TrainJob list
    cy.interceptK8sList(
      { model: TrainJobModel, ns: projectName },
      mockK8sResourceList(mockInadmissibleTrainJobs),
    );

    // ── BROAD interceptor FIRST (lowest priority in Cypress) ──
    // Namespace-wide workload list (used by the rewritten hook)
    cy.interceptK8sList(
      { model: WorkloadModel, ns: projectName },
      mockK8sResourceList([mockInadmissibleWorkload]),
    );

    // ── SPECIFIC interceptors AFTER (higher priority in Cypress) ──

    // Workload by TrainJob UID → empty (simulates UID mismatch)
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
        queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${TRAIN_JOB_UID}` },
      },
      mockK8sResourceList([]),
    ).as('getWorkloadsByTrainJobUid');

    // Workload by job-name → empty (forces JobSet fallback)
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
        queryParams: { labelSelector: `kueue.x-k8s.io/job-name=${TRAIN_JOB_NAME}` },
      },
      mockK8sResourceList([]),
    ).as('getWorkloadsByJobName');

    // JobSet namespace list — what useWorkloadForTrainJob watches to resolve the
    // current JobSet uid. Returning TRAIN_JOBSET_UID here is what lets the hook
    // cross-verify the Workload ownerReference uid instead of falling back to
    // name-only matching (!currentJobSetUid).
    cy.interceptK8sList(
      { model: JobSetModel, ns: projectName },
      mockK8sResourceList([
        {
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          metadata: { name: TRAIN_JOB_NAME, namespace: projectName, uid: TRAIN_JOBSET_UID },
        },
      ]),
    ).as('listJobSets');

    // JobSet GET by name — still the path used to render the row badge:
    // useJobStatuses → getTrainingJobStatus → api/workloads#getWorkloadForJob resolves
    // the JobSet uid this way, then lists workloads by kueue.x-k8s.io/job-uid.
    cy.interceptK8s(
      { model: JobSetModel, ns: projectName, name: TRAIN_JOB_NAME },
      {
        apiVersion: 'jobset.x-k8s.io/v1alpha2',
        kind: 'JobSet',
        metadata: { name: TRAIN_JOB_NAME, namespace: projectName, uid: TRAIN_JOBSET_UID },
      },
    ).as('getJobSet');

    // Workload by JobSet UID → returns the inadmissible workload
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
        queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${TRAIN_JOBSET_UID}` },
      },
      mockK8sResourceList([mockInadmissibleWorkload]),
    ).as('getWorkloadsByJobSetUid');
  };

  it('should display Inadmissible badge for over-capacity TrainJob', () => {
    setupIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    // Verify the fallback path was exercised:
    // 1. TrainJob UID lookup returned empty
    cy.wait('@getWorkloadsByTrainJobUid');
    // 2. job-name lookup returned empty
    cy.wait('@getWorkloadsByJobName');
    // 3. JobSet was fetched to resolve its uid
    cy.wait('@getJobSet');
    // 4. Workload was found via JobSet UID. This alias only matches a request whose
    //    labelSelector is kueue.x-k8s.io/job-uid=TRAIN_JOBSET_UID, and that uid is only
    //    obtainable from the JobSet response in step 3 — the job-name fallback in step 2
    //    returned empty, so this request cannot come from a name match. Steps 3+4 plus
    //    the Inadmissible badge below are the end-to-end proof of the uid link between
    //    the JobSet and the Workload ownerReference.
    cy.wait('@getWorkloadsByJobSetUid');

    const row = trainingJobTable.getTableRow(TRAIN_JOB_NAME);
    row.findStatus().should('contain', 'Inadmissible');
    row.findStatus().should('not.contain', 'Running');
    row.findStatus().should('not.contain', 'Queued');
  });
});
