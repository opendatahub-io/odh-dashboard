/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { TrainJobModel } from '@odh-dashboard/internal/api/models';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { projectName, initIntercepts } from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { modelTrainingGlobal, trainingJobTable } from '../../../pages/modelTraining';

// --- Mock data: TrainJob with a Workload labeled by JobSet UID (not TrainJob UID) ---

const TRAIN_JOB_NAME = 'inadmissible-gpu-job';
const TRAIN_JOB_UID = 'trainjob-uid-aaaa-bbbb';
const JOBSET_UID = 'jobset-uid-cccc-dddd';

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

// Override the UID to a known value for assertion
mockInadmissibleTrainJobs[0].metadata.uid = TRAIN_JOB_UID;

/**
 * Workload labeled with the JobSet UID (not the TrainJob UID).
 * Condition: QuotaReserved=False, reason=Pending, message contains "> maximum capacity".
 */
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
        // Key: Kueue labels with the JobSet UID, NOT the TrainJob UID
        'kueue.x-k8s.io/job-uid': JOBSET_UID,
        'kueue.x-k8s.io/job-name': TRAIN_JOB_NAME,
      },
      ownerReferences: [
        {
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          name: TRAIN_JOB_NAME,
          uid: JOBSET_UID,
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
    // Base intercepts (projects, config, DSC, queues, etc.)
    initIntercepts();

    // Override TrainJob list with our inadmissible job
    cy.interceptK8sList(
      { model: TrainJobModel, ns: projectName },
      mockK8sResourceList(mockInadmissibleTrainJobs),
    );

    // Workload list WITHOUT label selector (namespace-wide, used by the rewritten hook)
    cy.interceptK8sList(
      { model: WorkloadModel, ns: projectName },
      mockK8sResourceList([mockInadmissibleWorkload]),
    );

    // Workload list WITH label selector for TrainJob UID (returns empty — simulates mismatch)
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
        queryParams: {
          labelSelector: `kueue.x-k8s.io/job-uid=${TRAIN_JOB_UID}`,
        },
      },
      mockK8sResourceList([]),
    );

    // Workload list WITH label selector for job-name (returns the workload)
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
        queryParams: {
          labelSelector: `kueue.x-k8s.io/job-name=${TRAIN_JOB_NAME}`,
        },
      },
      mockK8sResourceList([mockInadmissibleWorkload]),
    );
  };

  it('should display Inadmissible badge for over-capacity TrainJob', () => {
    setupIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const row = trainingJobTable.getTableRow(TRAIN_JOB_NAME);
    row.findStatus().should('contain', 'Inadmissible');
    row.findStatus().should('not.contain', 'Running');
    row.findStatus().should('not.contain', 'Queued');
  });

  it('should maintain stable Inadmissible status without flickering', () => {
    setupIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    // Cypress retries assertions automatically — if the status flickered
    // between Inadmissible→Running→Inadmissible, the not.contain checks
    // would catch the transient state. Re-querying the DOM after the
    // initial assertion guards against late flicker.
    const row = trainingJobTable.getTableRow(TRAIN_JOB_NAME);
    row.findStatus().should('contain', 'Inadmissible');

    row.findStatus().should('contain', 'Inadmissible');
    row.findStatus().should('not.contain', 'Running');
    row.findStatus().should('not.contain', 'Queued');
  });
});
