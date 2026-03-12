/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import {
  TrainingJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
} from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import {
  ClusterQueueModel,
  LocalQueueModel,
  RayJobModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  rayJobDetailsDrawer,
} from '../../../pages/modelTraining';
import { ProjectModel } from '../../../utils/models';

const projectName = 'test-rayjobs-project';
const projectDisplayName = 'Test RayJobs Project';
const KUEUE_QUEUE_LABEL = 'kueue.x-k8s.io/queue-name';
const KUEUE_JOB_UID_LABEL = 'kueue.x-k8s.io/job-uid';
const KUEUE_JOB_NAME_LABEL = 'kueue.x-k8s.io/job-name';

const mockTrainJobs = mockTrainJobK8sResourceList([
  {
    name: 'train-job-one',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-15T10:30:00Z',
  },
]);

const mockRayJobs = mockRayJobK8sResourceList([
  {
    name: 'ray-data-processing',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    entrypoint: 'python process_data.py',
  },
  {
    name: 'ray-completed-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.SUCCEEDED,
    jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
    succeeded: 1,
  },
  {
    name: 'ray-failed-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.FAILED,
    jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
    failed: 1,
  },
  {
    name: 'ray-suspended-job',
    namespace: projectName,
    suspend: true,
    jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
  },
  {
    name: 'ray-pending-job',
    namespace: projectName,
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-queued-job',
    namespace: projectName,
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
    jobStatus: undefined,
  },
  {
    name: 'ray-deleting-job',
    namespace: projectName,
    isDeleting: true,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
  },
  {
    name: 'ray-inadmissible-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-preempted-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-queued-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-pending-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
]);

// Build workloads for each Kueue-managed RayJob, linking by job UID + name labels.
// This mirrors the pattern in modelTraining.cy.ts so the frontend's label-selector
// lookup resolves to the correct workload in both real and mocked environments.
const kueueWorkloadStatusMap: Record<string, WorkloadStatusType> = {
  'ray-inadmissible-kueue': WorkloadStatusType.Inadmissible,
  'ray-preempted-kueue': WorkloadStatusType.Evicted,
  'ray-queued-kueue': WorkloadStatusType.Pending,
  'ray-pending-kueue': WorkloadStatusType.Admitted, // overridden below to QuotaReserved=True only
};

const mockRayJobWorkloads = mockRayJobs
  .filter((job) => job.metadata.labels?.[KUEUE_QUEUE_LABEL])
  .map((job) => {
    const workloadStatus = kueueWorkloadStatusMap[job.metadata.name];
    const workload = mockWorkloadK8sResource({
      k8sName: `workload-${job.metadata.name}`,
      namespace: job.metadata.namespace,
      mockStatus: workloadStatus,
    });

    // Override conditions for Pending-kueue: QuotaReserved=True but no PodsReady
    // This drives the "Pending" display path (quota reserved, pods not yet scheduled)
    if (job.metadata.name === 'ray-pending-kueue' && workload.status) {
      workload.status.conditions = [
        {
          lastTransitionTime: '2024-03-18T19:15:28Z',
          message: 'Quota reserved in ClusterQueue test-cluster-queue',
          reason: 'QuotaReserved',
          status: 'True',
          type: 'QuotaReserved',
        },
      ];
    }

    return {
      ...workload,
      metadata: {
        ...workload.metadata,
        labels: {
          ...(workload.metadata?.labels ?? {}),
          [KUEUE_JOB_UID_LABEL]: job.metadata.uid ?? `uid-${job.metadata.name}`,
          [KUEUE_JOB_NAME_LABEL]: job.metadata.name,
        },
      },
    };
  });

const mockLocalQueues = [
  mockLocalQueueK8sResource({
    name: 'default-queue',
    namespace: projectName,
  }),
];

const mockClusterQueues = [
  mockClusterQueueK8sResource({
    name: 'test-cluster-queue',
  }),
];

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      trainingJobs: true,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: projectName,
        displayName: projectDisplayName,
        enableKueue: true,
      }),
    ]),
  );

  cy.interceptK8sList(
    {
      model: TrainJobModel,
      ns: projectName,
    },
    mockK8sResourceList(mockTrainJobs),
  );

  cy.interceptK8sList(
    {
      model: RayJobModel,
      ns: projectName,
    },
    mockK8sResourceList(mockRayJobs),
  );

  cy.interceptK8sList(
    {
      model: LocalQueueModel,
      ns: projectName,
    },
    mockK8sResourceList(mockLocalQueues),
  );

  mockLocalQueues.forEach((queue) => {
    if (queue.metadata?.name) {
      cy.interceptK8s(
        {
          model: LocalQueueModel,
          ns: projectName,
          name: queue.metadata.name,
        },
        queue,
      );
    }
  });

  cy.interceptK8s({ model: ClusterQueueModel, name: 'test-cluster-queue' }, mockClusterQueues[0]);

  mockRayJobs
    .filter((job) => job.metadata.labels?.[KUEUE_QUEUE_LABEL])
    .forEach((job) => {
      const matchingWorkload = mockRayJobWorkloads.find(
        (w) =>
          w.metadata.labels[KUEUE_JOB_UID_LABEL] === job.metadata.uid ||
          w.metadata.labels[KUEUE_JOB_NAME_LABEL] === job.metadata.name,
      );

      if (matchingWorkload && job.metadata.uid) {
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
            queryParams: {
              labelSelector: `${KUEUE_JOB_UID_LABEL}=${job.metadata.uid}`,
            },
          },
          mockK8sResourceList([matchingWorkload]),
        );
      }

      if (matchingWorkload) {
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
            queryParams: {
              labelSelector: `${KUEUE_JOB_NAME_LABEL}=${job.metadata.name}`,
            },
          },
          mockK8sResourceList([matchingWorkload]),
        );
      }
    });
};

describe('RayJobs in Jobs Table', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display correct data in RayJob table rows', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    rayRow.findProject().should('contain', projectDisplayName);
    rayRow.findNodes().should('contain', '1');
    rayRow.findType().should('contain', 'RayJob');
    rayRow.findRayCluster().should('not.be.empty');
  });

  it('should show delete option in RayJob kebab menu', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findKebabButton().click();

    cy.findByRole('menuitem', { name: 'Delete job' }).should('exist');
  });

  it('should filter RayJobs by name', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    cy.findByTestId('training-job-table-toolbar')
      .findByLabelText('Filter by name')
      .type('ray-data');

    trainingJobTable.getTableRow('ray-data-processing').find().should('exist');
    trainingJobTable.findTable().find('tbody tr').should('have.length', 1);

    cy.findByTestId('training-job-table-toolbar').findByLabelText('Filter by name').clear();

    trainingJobTable.getTableRow('train-job-one').find().should('exist');
    trainingJobTable.getTableRow('ray-data-processing').find().should('exist');
  });
});

describe('Type filter in Jobs Table', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should filter to show only TrainJobs when TrainJob type is selected', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.selectJobTypeFilter('TrainJob');

    const trainRow = trainingJobTable.getTableRow('train-job-one');

    trainingJobTable.findTypeFilterChip().should('contain', 'TrainJob');
    trainRow.findType().should('contain', 'TrainJob');
    trainingJobTable.findTypeColumn().should('not.contain', 'RayJob');
    trainingJobTable.findRows().should('have.length', 1);
  });

  it('should filter to show only RayJobs when RayJob type is selected', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.selectJobTypeFilter('RayJob');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('contain', 'RayJob');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    trainingJobTable.findTypeColumn().should('not.contain', 'TrainJob');
    trainingJobTable.findRows().should('have.length', 11);
  });

  it('should show all jobs after selecting All in type filter', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.selectJobTypeFilter('TrainJob');
    trainingJobTable.findRows().should('have.length', 1);

    trainingJobTable.findTypeFilterSelectToggle().click();
    cy.findByRole('option', { name: 'All' }).click();

    const trainRow = trainingJobTable.getTableRow('train-job-one');
    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('not.exist');
    trainRow.findTrainingJobName().should('contain', 'train-job-one');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    trainingJobTable.findRows().should('have.length', 12);
  });
});

describe('RayJob status column', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
  });

  it('should show Running status for a running RayJob', () => {
    trainingJobTable.getTableRow('ray-data-processing').findStatus().should('contain', 'Running');
  });

  it('should show Complete status for a succeeded RayJob', () => {
    trainingJobTable.getTableRow('ray-completed-job').findStatus().should('contain', 'Complete');
  });

  it('should show Failed status for a failed RayJob', () => {
    trainingJobTable.getTableRow('ray-failed-job').findStatus().should('contain', 'Failed');
  });

  it('should show Paused status for a Paused RayJob', () => {
    trainingJobTable.filterByName('ray-suspended-job');
    trainingJobTable.getTableRow('ray-suspended-job').findStatus().should('contain', 'Paused');
  });

  it('should show Pending status for an initializing RayJob', () => {
    trainingJobTable.getTableRow('ray-pending-job').findStatus().should('contain', 'Pending');
  });

  it('should show Queued status for a waiting RayJob', () => {
    trainingJobTable.getTableRow('ray-queued-job').findStatus().should('contain', 'Queued');
  });

  it('should show Deleting status for a RayJob with deletionTimestamp', () => {
    trainingJobTable.getTableRow('ray-deleting-job').findStatus().should('contain', 'Deleting');
  });

  it('should show status label component (not raw icon+text) for RayJob rows', () => {
    trainingJobTable
      .getTableRow('ray-data-processing')
      .find()
      .find('[data-label="Status"]')
      .findByTestId('training-job-status')
      .should('exist');
  });
  it('should show Inadmissible status when Kueue rejects the workload', () => {
    trainingJobTable
      .getTableRow('ray-inadmissible-kueue')
      .findStatus()
      .should('contain', 'Inadmissible');
  });

  it('should show Preempted status when Kueue evicts the workload', () => {
    trainingJobTable.getTableRow('ray-preempted-kueue').findStatus().should('contain', 'Preempted');
  });

  it('should show Queued status when Kueue workload is waiting for quota', () => {
    trainingJobTable.getTableRow('ray-queued-kueue').findStatus().should('contain', 'Queued');
  });

  it('should show Pending status when Kueue quota is reserved but pods not yet scheduled', () => {
    trainingJobTable.getTableRow('ray-pending-kueue').findStatus().should('contain', 'Pending');
  });
});

describe('RayJob Details Drawer', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should open RayJob drawer when clicking on a RayJob name', () => {
    modelTrainingGlobal.visit(projectName);

    rayJobDetailsDrawer.shouldBeClosed();

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.findTitle().should('contain', 'ray-data-processing');
  });

  it('should have all four tabs', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.findTab('Details').should('exist');
    rayJobDetailsDrawer.findTab('Resources').should('exist');
    rayJobDetailsDrawer.findTab('Pods').should('exist');
    rayJobDetailsDrawer.findTab('Logs').should('exist');
  });

  it('should have delete action in kebab menu', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Delete job').should('exist');
  });

  it('should close drawer when clicking close button', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.close();
    rayJobDetailsDrawer.shouldBeClosed();
  });

  it('should open TrainJob drawer when clicking a TrainJob after closing RayJob drawer', () => {
    modelTrainingGlobal.visit(projectName);

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findNameLink().click();
    rayJobDetailsDrawer.shouldBeOpen();

    rayJobDetailsDrawer.close();
    rayJobDetailsDrawer.shouldBeClosed();

    const trainRow = trainingJobTable.getTableRow('train-job-one');
    trainRow.findNameLink().click();
    trainingJobDetailsDrawer.shouldBeOpen();
  });
});
