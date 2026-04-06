/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import { mockRayClusterK8sResource } from '@odh-dashboard/model-training/__mocks__/mockRayClusterK8sResource';
import {
  TrainingJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
} from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import {
  ClusterQueueModel,
  GatewayModel,
  HTTPRouteModel,
  LocalQueueModel,
  RayClusterModel,
  RayJobModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { mock404Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  rayJobDetailsDrawer,
  rayJobDetailsTab,
  rayJobResourcesTab,
  editRayJobNodeCountModal,
  pauseRayJobModal,
  rayJobPodsTab,
  rayJobLogsTab,
  rayJobStatusModal,
} from '../../../pages/modelTraining';
import { tablePagination } from '../../../pages/components/Pagination';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { ProjectModel, PodModel } from '../../../utils/models';

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
    rayClusterName: null,
    succeeded: 1,
  },
  {
    name: 'ray-failed-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.FAILED,
    jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
    failed: 1,
    reason: 'AppFailed',
    message: 'Ray job failed due to application error.',
  },
  {
    name: 'ray-suspended-job',
    namespace: projectName,
    suspend: true,
    jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
  },
  {
    name: 'ray-multi-group-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    entrypoint: 'python multi_worker.py',
    additionalLabels: { 'kueue.x-k8s.io/queue-name': 'default-queue' },
    workerGroupSpecs: [
      {
        groupName: 'gpu-workers',
        replicas: 2,
        minReplicas: 1,
        maxReplicas: 4,
        template: {
          spec: {
            containers: [
              {
                name: 'ray-worker',
                resources: {
                  requests: { cpu: '2', memory: '4Gi' },
                  limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': '1' },
                },
              },
            ],
          },
        },
      },
      {
        groupName: 'cpu-workers',
        replicas: 3,
        minReplicas: 1,
        maxReplicas: 6,
        template: {
          spec: {
            containers: [
              {
                name: 'ray-worker',
                resources: {
                  requests: { cpu: '1', memory: '2Gi' },
                  limits: { cpu: '2', memory: '4Gi' },
                },
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'ray-persist-cluster-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    shutdownAfterJobFinishes: false,
    entrypoint: 'python interactive.py',
  },
  {
    name: 'ray-workspace-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    clusterSelector: { 'ray.io/cluster': 'shared-ray-cluster' },
    rayClusterName: 'shared-ray-cluster',
    entrypoint: 'python workspace_train.py',
  },
  {
    name: 'ray-pending-job',
    namespace: projectName,
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    clusterSelector: { 'ray.io/cluster': 'shared-ray-cluster' },
    rayClusterName: 'shared-ray-cluster',
    entrypoint: 'python workspace_train.py',
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
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
    jobStatus: undefined,
  },
  {
    name: 'ray-pending-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
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

  cy.interceptK8sList(
    { model: PodModel, ns: projectName },
    mockK8sResourceList([
      mockPodK8sResource({
        name: 'ray-data-processing-submitter-abc',
        namespace: projectName,
        labels: { 'batch.kubernetes.io/job-name': 'ray-data-processing' },
      }),
      mockPodK8sResource({
        name: 'ray-data-processing-raycluster-head-xyz',
        namespace: projectName,
        labels: {
          'ray.io/cluster': 'ray-data-processing-raycluster',
          'ray.io/node-type': 'head',
        },
      }),
      mockPodK8sResource({
        name: 'ray-data-processing-raycluster-worker-1',
        namespace: projectName,
        labels: {
          'ray.io/cluster': 'ray-data-processing-raycluster',
          'ray.io/node-type': 'worker',
          'ray.io/group': 'worker-group-1',
        },
      }),
    ]),
  );

  cy.interceptK8s(
    { model: RayClusterModel, ns: projectName, name: 'shared-ray-cluster' },
    mockRayClusterK8sResource({
      name: 'shared-ray-cluster',
      namespace: projectName,
      rayVersion: '2.40.0',
    }),
  );
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

  cy.intercept('GET', '**/ray-job-logs/*/*/*/*', {
    body: 'Sample RayJob driver log output\nLine 2 of logs',
  });
};

const createWorkloadForRayJob = (
  job: (typeof mockRayJobs)[number],
  overrides: { active?: boolean } = {},
) => {
  const workload = mockWorkloadK8sResource({
    k8sName: `workload-${job.metadata.name}`,
    namespace: projectName,
    mockStatus: WorkloadStatusType.Running,
  });
  workload.spec = {
    ...workload.spec,
    ...('active' in overrides ? { active: overrides.active } : {}),
  };
  if (workload.metadata) {
    workload.metadata.labels = {
      ...(workload.metadata.labels || {}),
      'kueue.x-k8s.io/job-uid': job.metadata.uid || `uid-${job.metadata.name}`,
      'kueue.x-k8s.io/job-name': job.metadata.name,
    };
  }
  return workload;
};

const runningWorkload = createWorkloadForRayJob(mockRayJobs[0]);
const suspendedWorkload = createWorkloadForRayJob(mockRayJobs[3], { active: false });
const runningJobUid = mockRayJobs[0].metadata.uid ?? '';
const suspendedJobUid = mockRayJobs[3].metadata.uid ?? '';

const initPauseResumeIntercepts = () => {
  initIntercepts();

  cy.interceptK8sList(
    { model: WorkloadModel, ns: projectName },
    mockK8sResourceList([runningWorkload, suspendedWorkload]),
  );

  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: projectName,
      queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${runningJobUid}` },
    },
    mockK8sResourceList([runningWorkload]),
  );

  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: projectName,
      queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${suspendedJobUid}` },
    },
    mockK8sResourceList([suspendedWorkload]),
  );
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
    rayRow.findNodes().should('contain', '2');
    rayRow.findType().should('contain', 'RayJob');
    rayRow.findRayCluster().should('not.be.empty');
  });

  it('should show delete option in RayJob kebab menu', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findKebabButton().click();

    rayRow.findKebabMenuItem('Delete job').should('exist');
  });

  it('should open delete modal with job name in title and correct body text', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findKebabButton().click();
    rayRow.findKebabMenuItem('Delete job').click();

    deleteModal.shouldBeOpen();
    deleteModal.find().should('contain', 'Delete ray-data-processing job?');
    deleteModal
      .find()
      .should('contain', 'ray-data-processing')
      .and('contain', 'all of its resources will be deleted');
  });

  it('should filter RayJobs by name', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.filterByName('ray-data');
    trainingJobTable.getTableRow('ray-data-processing').find().should('exist');
    trainingJobTable.findTable().find('tbody tr').should('have.length', 1);

    trainingJobTable.filterByName('train-job-one');
    trainingJobTable.getTableRow('train-job-one').find().should('exist');

    trainingJobTable.filterByName('ray-data-processing');
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
    tablePagination.top.selectToggleOption('20 per page');

    trainingJobTable.selectJobTypeFilter('RayJob');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('contain', 'RayJob');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
    trainingJobTable.findTypeColumn().should('not.contain', 'TrainJob');
  });

  it('should show all jobs after selecting All in type filter', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
    tablePagination.top.selectToggleOption('20 per page');

    trainingJobTable.selectJobTypeFilter('TrainJob');
    trainingJobTable.findRows().should('have.length', 1);

    trainingJobTable.findTypeFilterSelectToggle().click();
    cy.findByRole('option', { name: 'All' }).click();

    const trainRow = trainingJobTable.getTableRow('train-job-one');
    const rayRow = trainingJobTable.getTableRow('ray-data-processing');

    trainingJobTable.findTypeFilterChip().should('not.exist');
    trainRow.findTrainingJobName().should('contain', 'train-job-one');
    rayRow.findTrainingJobName().should('contain', 'ray-data-processing');
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
    trainingJobTable.filterByName('ray-queued-job');
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
      .findByTestId('ray-job-status')
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
    trainingJobTable.filterByName('ray-queued-kueue');
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

    trainingJobTable.filterByName('train-job-one');
    const trainRow = trainingJobTable.getTableRow('train-job-one');
    trainRow.findNameLink().click();
    trainingJobDetailsDrawer.shouldBeOpen();
  });
});

describe('RayJob Details Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display all sections in the Details tab', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab.findJobSummarySection().should('exist');
    rayJobDetailsTab.findExecutionsSection().should('exist');
    rayJobDetailsTab.findManagementSection().should('exist');
  });

  it('should display correct job summary values', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab.findRayVersionValue().should('contain', '2.9.0');
  });

  it('should display correct executions values', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab.findEntrypointCommandValue().should('contain', 'python process_data.py');
    rayJobDetailsTab.findSubmissionModeValue().should('contain', 'K8sJobMode');
  });

  it('should display correct management values', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab
      .findShutdownPolicyValue()
      .should('contain', 'Cluster is deleted after job finishes');
    rayJobDetailsTab.findClusterNameValue().should('contain', 'ray-data-processing-raycluster');
  });

  it('should show alternate shutdown policy when cluster persists after job finishes', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-persist-cluster-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab
      .findShutdownPolicyValue()
      .should('contain', 'Cluster persists after job finishes');
  });

  it('should display ray version from workspace RayCluster', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-workspace-job');
    const row = trainingJobTable.getTableRow('ray-workspace-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Details');

    rayJobDetailsTab.findRayVersionValue().should('contain', '2.40.0');
    rayJobDetailsTab.findClusterNameValue().should('contain', 'shared-ray-cluster');
  });
});

describe('RayJob Resources Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display all sections in the Resources tab', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Resources');

    rayJobResourcesTab.findNodeConfigurationsSection().should('exist');
    rayJobResourcesTab.findResourcesPerNodeSection().should('exist');
    rayJobResourcesTab.findClusterQueueSection().should('exist');
    rayJobResourcesTab.findQuotasSection().should('exist');
  });

  it('should display correct node count', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Resources');

    rayJobResourcesTab.findNodesValue().should('contain', '2');
    rayJobResourcesTab.findProcessesPerNodeValue().should('contain', '1');
  });

  it('should display per-worker-group resources', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Resources');

    rayJobResourcesTab.findWorkerGroupTitle('worker-group-1').should('exist');
    rayJobResourcesTab.findWorkerGroupCpuRequests('worker-group-1').should('contain', '1');
    rayJobResourcesTab.findWorkerGroupCpuLimits('worker-group-1').should('contain', '2');
    rayJobResourcesTab.findWorkerGroupMemoryRequests('worker-group-1').should('contain', '2Gi');
    rayJobResourcesTab.findWorkerGroupMemoryLimits('worker-group-1').should('contain', '2Gi');
  });

  it('should display multiple worker groups', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-multi-group-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Resources');

    rayJobResourcesTab.findWorkerGroupTitle('gpu-workers').should('exist');
    rayJobResourcesTab.findWorkerGroupCpuRequests('gpu-workers').should('contain', '2');
    rayJobResourcesTab.findWorkerGroupMemoryLimits('gpu-workers').should('contain', '8Gi');

    rayJobResourcesTab.findWorkerGroupTitle('cpu-workers').should('exist');
    rayJobResourcesTab.findWorkerGroupCpuRequests('cpu-workers').should('contain', '1');
    rayJobResourcesTab.findWorkerGroupMemoryLimits('cpu-workers').should('contain', '4Gi');
  });

  it('should display cluster queue and quota consumption', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-multi-group-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Resources');

    rayJobResourcesTab.findClusterQueueSection().should('exist');
    rayJobResourcesTab.findQueueValue().should('contain', 'test-cluster-queue');

    rayJobResourcesTab.findQuotasSection().should('exist');
    rayJobResourcesTab.findConsumedQuotaValue().should('contain', 'CPU');
    rayJobResourcesTab.findConsumedQuotaValue().should('contain', 'Memory');
  });
});

describe('Edit node count modal for RayJobs', () => {
  const lifecycleJobWithGroups = mockRayJobK8sResourceList([
    {
      name: 'ray-multi-group-job',
      namespace: projectName,
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
      workerGroupSpecs: [
        { groupName: 'worker-group-1', replicas: 1, template: {} },
        { groupName: 'worker-group-2', replicas: 1, template: {} },
      ],
    },
    {
      name: 'ray-workspace-job',
      namespace: projectName,
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
      clusterSelector: { 'ray.io/cluster': 'shared-ray-cluster' },
      rayClusterName: 'shared-ray-cluster',
    },
  ]);

  const initEditIntercepts = () => {
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

    cy.interceptK8sList({ model: TrainJobModel, ns: projectName }, mockK8sResourceList([]));

    cy.interceptK8sList(
      { model: RayJobModel, ns: projectName },
      mockK8sResourceList(lifecycleJobWithGroups),
    );

    cy.interceptK8sList({ model: LocalQueueModel, ns: projectName }, mockK8sResourceList([]));
  };

  beforeEach(() => {
    asClusterAdminUser();
    initEditIntercepts();
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');
  });

  it('should show the edit icon only for lifecycle RayJobs, not workspace-cluster jobs', () => {
    trainingJobTable.getTableRow('ray-multi-group-job').findEditNodeCountButton().should('exist');
    trainingJobTable.getTableRow('ray-workspace-job').findEditNodeCountButton().should('not.exist');
  });

  it('should show Edit node count in the kebab menu and open the modal', () => {
    trainingJobTable.getTableRow('ray-multi-group-job').findKebabButton().click();
    trainingJobTable
      .getTableRow('ray-multi-group-job')
      .findKebabMenuItem('Edit node count')
      .should('exist')
      .click();
    editRayJobNodeCountModal.shouldBeOpen();
  });

  it('should not show Edit node count in the kebab menu for workspace-cluster jobs', () => {
    trainingJobTable.getTableRow('ray-workspace-job').findKebabButton().click();
    trainingJobTable
      .getTableRow('ray-workspace-job')
      .findKebabMenuItem('Edit node count')
      .should('not.exist');
  });

  it('should open the modal with correct initial state: head node disabled, Save disabled', () => {
    trainingJobTable.getTableRow('ray-multi-group-job').findEditNodeCountButton().click();

    editRayJobNodeCountModal.shouldBeOpen();
    editRayJobNodeCountModal.findHeadNodeInput().should('have.value', '1');
    editRayJobNodeCountModal.findHeadNodeInput().should('be.disabled');
    editRayJobNodeCountModal.findWorkerGroupInput('worker-group-1').should('have.value', '1');
    editRayJobNodeCountModal.findWorkerGroupInput('worker-group-2').should('have.value', '1');
    editRayJobNodeCountModal.findSaveButton().should('be.disabled');
  });

  it('should enable Save after a change and disable it again when reverted', () => {
    trainingJobTable.getTableRow('ray-multi-group-job').findEditNodeCountButton().click();

    editRayJobNodeCountModal.shouldBeOpen();
    editRayJobNodeCountModal.findSaveButton().should('be.disabled');

    editRayJobNodeCountModal.findWorkerGroupPlusButton('worker-group-1').click();
    editRayJobNodeCountModal.findWorkerGroupInput('worker-group-1').should('have.value', '2');
    editRayJobNodeCountModal.findWorkerGroupInput('worker-group-2').should('have.value', '1');
    editRayJobNodeCountModal.findSaveButton().should('be.enabled');

    editRayJobNodeCountModal.findWorkerGroupMinusButton('worker-group-1').click();
    editRayJobNodeCountModal.findWorkerGroupInput('worker-group-1').should('have.value', '1');
    editRayJobNodeCountModal.findSaveButton().should('be.disabled');
  });

  it('should disable the minus button for a worker group already at 0 replicas', () => {
    const jobWithZeroGroup = mockRayJobK8sResourceList([
      {
        name: 'ray-zero-group-job',
        namespace: projectName,
        jobStatus: RayJobStatusValue.RUNNING,
        jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
        workerGroupSpecs: [{ groupName: 'worker-group-1', replicas: 0, template: {} }],
      },
    ]);

    cy.interceptK8sList(
      { model: RayJobModel, ns: projectName },
      mockK8sResourceList(jobWithZeroGroup),
    );
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.getTableRow('ray-zero-group-job').findEditNodeCountButton().click();

    editRayJobNodeCountModal.shouldBeOpen();
    editRayJobNodeCountModal.findWorkerGroupMinusButton('worker-group-1').should('be.disabled');
  });

  it('should close the modal when Cancel is clicked', () => {
    trainingJobTable.getTableRow('ray-multi-group-job').findEditNodeCountButton().click();

    editRayJobNodeCountModal.shouldBeOpen();
    editRayJobNodeCountModal.findCancelButton().click();
    editRayJobNodeCountModal.shouldBeClosed();
  });

  it('should patch the RayJob with only the changed groups and close the modal on Save', () => {
    cy.interceptK8s(
      'PATCH',
      { model: RayJobModel, ns: projectName, name: 'ray-multi-group-job' },
      lifecycleJobWithGroups[0],
    ).as('patchRayJob');

    trainingJobTable.getTableRow('ray-multi-group-job').findEditNodeCountButton().click();

    editRayJobNodeCountModal.shouldBeOpen();

    editRayJobNodeCountModal.findWorkerGroupPlusButton('worker-group-1').click();
    editRayJobNodeCountModal.findWorkerGroupPlusButton('worker-group-2').click();
    editRayJobNodeCountModal.findWorkerGroupPlusButton('worker-group-2').click();

    editRayJobNodeCountModal.findSaveButton().click();

    cy.wait('@patchRayJob').then((interception) => {
      expect(interception.request.body).to.deep.equal([
        {
          op: 'replace',
          path: '/spec/rayClusterSpec/workerGroupSpecs/0/replicas',
          value: 2,
        },
        {
          op: 'replace',
          path: '/spec/rayClusterSpec/workerGroupSpecs/1/replicas',
          value: 3,
        },
      ]);
    });
    editRayJobNodeCountModal.shouldBeClosed();
  });
});

describe('RayJob Pause/Resume - Table Toggle', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initPauseResumeIntercepts();
  });

  it('should show Pause toggle for running and Resume toggle for suspended RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable
      .getTableRow('ray-data-processing')
      .findPauseResumeToggle()
      .should('contain', 'Pause');

    trainingJobTable.filterByName('ray-suspended-job');
    trainingJobTable
      .getTableRow('ray-suspended-job')
      .findPauseResumeToggle()
      .should('contain', 'Resume');
  });

  it('should not show pause/resume toggle for terminal state RayJobs', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.getTableRow('ray-completed-job').findPauseResumeToggle().should('not.exist');
    trainingJobTable.getTableRow('ray-failed-job').findPauseResumeToggle().should('not.exist');
  });
});

describe('RayJob Pause/Resume - Pause Modal', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initPauseResumeIntercepts();
  });

  it('should open pause modal with job name when clicking Pause toggle', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    trainingJobTable.getTableRow('ray-data-processing').findPauseResumeToggle().click();

    pauseRayJobModal.shouldBeOpen();
    pauseRayJobModal.find().should('contain', 'ray-data-processing');
  });

  it('should close modal when Cancel is clicked', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    trainingJobTable.getTableRow('ray-data-processing').findPauseResumeToggle().click();

    pauseRayJobModal.shouldBeOpen();
    pauseRayJobModal.cancel();
    pauseRayJobModal.shouldBeOpen(false);
  });

  it('should pause Kueue-enabled RayJob by patching workload when confirmed', () => {
    const pausedWorkload = { ...runningWorkload, spec: { ...runningWorkload.spec, active: false } };
    cy.interceptK8s('PATCH', WorkloadModel, pausedWorkload).as('pauseWorkload');

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    trainingJobTable.getTableRow('ray-data-processing').findPauseResumeToggle().click();

    pauseRayJobModal.shouldBeOpen();
    pauseRayJobModal.pause();

    cy.wait('@pauseWorkload');
    pauseRayJobModal.shouldBeOpen(false);
    trainingJobTable
      .getTableRow('ray-data-processing')
      .findPauseResumeToggle()
      .should('contain', 'Resume');
  });

  it('should open pause modal from table row kebab menu', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findKebabButton().click();
    row.findKebabMenuItem('Pause job').click();

    pauseRayJobModal.shouldBeOpen();
  });

  it('should show dont-show-again checkbox and confirm pause', () => {
    const pausedWorkload = { ...runningWorkload, spec: { ...runningWorkload.spec, active: false } };
    cy.interceptK8s('PATCH', WorkloadModel, pausedWorkload).as('pauseWorkload');

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    trainingJobTable.getTableRow('ray-data-processing').findPauseResumeToggle().click();

    pauseRayJobModal.shouldBeOpen();
    pauseRayJobModal.findDontShowAgainCheckbox().should('exist').click();
    pauseRayJobModal.pause();

    cy.wait('@pauseWorkload');
    pauseRayJobModal.shouldBeOpen(false);
  });
});

describe('RayJob Pause/Resume - Resume Action', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initPauseResumeIntercepts();
  });

  it('should resume Kueue-enabled RayJob immediately without modal', () => {
    const resumedWorkload = {
      ...suspendedWorkload,
      spec: { ...suspendedWorkload.spec, active: true },
    };
    cy.interceptK8s('PATCH', WorkloadModel, resumedWorkload).as('resumeWorkload');

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-suspended-job');

    const row = trainingJobTable.getTableRow('ray-suspended-job');
    row.findPauseResumeToggle().click();

    pauseRayJobModal.shouldBeOpen(false);
    cy.wait('@resumeWorkload');
    trainingJobTable
      .getTableRow('ray-suspended-job')
      .findPauseResumeToggle()
      .should('contain', 'Pause');
  });

  it('should show Resume job in table row kebab menu for suspended RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-suspended-job');

    const row = trainingJobTable.getTableRow('ray-suspended-job');
    row.findKebabButton().click();

    row.findKebabMenuItem('Resume job').should('exist');
  });
});

describe('RayJob Pause/Resume - Drawer Kebab Menu', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initPauseResumeIntercepts();
  });

  it('should show Pause job option in drawer kebab for running RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Pause job').should('exist');
  });

  it('should show Resume job option in drawer kebab for suspended RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-suspended-job');

    const row = trainingJobTable.getTableRow('ray-suspended-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Resume job').should('exist');
  });

  it('should not show pause/resume in drawer kebab for completed RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-completed-job');

    const row = trainingJobTable.getTableRow('ray-completed-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Pause job').should('not.exist');
    rayJobDetailsDrawer.findKebabMenuItem('Resume job').should('not.exist');
  });

  it('should open pause modal from drawer kebab menu', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-data-processing');

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Pause job').click();

    pauseRayJobModal.shouldBeOpen();
  });
});

describe('Ray cluster column URL behavior', () => {
  const mockGateway = {
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'Gateway',
    metadata: {
      name: 'data-science-gateway',
      namespace: 'openshift-ingress',
    },
    spec: {
      listeners: [{ hostname: 'rh-ai.apps.example.com', port: 443, name: 'https' }],
    },
  };

  const mockHTTPRoute = (clusterName: string) => ({
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'HTTPRoute',
    metadata: {
      name: `${projectName}-${clusterName}`,
      namespace: 'opendatahub',
    },
    spec: {
      rules: [
        {
          filters: [
            {
              requestRedirect: {
                path: { replaceFullPath: `/ray/${projectName}/${clusterName}/#/` },
              },
            },
          ],
        },
      ],
    },
  });

  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should show lifecycled cluster name from status.rayClusterName as a link', () => {
    cy.interceptK8s(
      { model: GatewayModel, name: 'data-science-gateway', ns: 'openshift-ingress' },
      mockGateway,
    );
    cy.interceptK8s(
      { model: HTTPRouteModel, name: `${projectName}-ray-data-processing-raycluster` },
      mockHTTPRoute('ray-data-processing-raycluster'),
    );

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow
      .findRayCluster()
      .find('a')
      .should('contain', 'ray-data-processing-raycluster')
      .and('have.attr', 'href')
      .and('include', 'rh-ai.apps.example.com');
  });

  it('should show Ray cluster name as plain text when Gateway is unavailable', () => {
    cy.interceptK8s(
      { model: GatewayModel, name: 'data-science-gateway', ns: 'openshift-ingress' },
      { statusCode: 404, body: mock404Error({}) },
    );

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    const rayRow = trainingJobTable.getTableRow('ray-data-processing');
    rayRow.findRayCluster().should('contain', 'ray-data-processing-raycluster');
    rayRow.findRayCluster().find('a').should('not.exist');
  });

  it('should show workspace cluster name from clusterSelector in the Ray cluster column', () => {
    cy.interceptK8s(
      { model: GatewayModel, name: 'data-science-gateway', ns: 'openshift-ingress' },
      mockGateway,
    );
    cy.interceptK8s(
      { model: HTTPRouteModel, name: `${projectName}-shared-ray-cluster` },
      mockHTTPRoute('shared-ray-cluster'),
    );

    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.filterByName('ray-workspace-job');
    const workspaceRow = trainingJobTable.getTableRow('ray-workspace-job');
    workspaceRow
      .findRayCluster()
      .find('a')
      .should('contain', 'shared-ray-cluster')
      .and('have.attr', 'target', '_blank');
  });

  it('should show dash for jobs without a Ray cluster name', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.findTable().should('be.visible');

    trainingJobTable.filterByName('ray-queued-job');
    const queuedRow = trainingJobTable.getTableRow('ray-queued-job');
    queuedRow.findRayCluster().should('contain', '-');
  });
});

describe('RayJob Pods Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display submitter pod section with pod name', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Pods');

    rayJobPodsTab.findSubmitterPodSection().should('exist');
    rayJobPodsTab.findSubmitterPodSection().should('contain', 'ray-data-processing-submitter-abc');
  });

  it('should display head pod with role and restarts', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Pods');

    rayJobPodsTab.findRayClusterPodsSection().should('exist');
    rayJobPodsTab.findRayClusterPodsSection().should('contain', 'Ray Head');
    rayJobPodsTab
      .findRayClusterPodsSection()
      .should('contain', 'ray-data-processing-raycluster-head-xyz');
    rayJobPodsTab.findRayClusterPodsSection().should('contain', 'Restarts');
  });

  it('should display worker group name and worker pods', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Pods');

    rayJobPodsTab.findRayClusterPodsSection().should('contain', 'Ray Worker');
    rayJobPodsTab.findRayClusterPodsSection().should('contain', 'worker-group-1');
    rayJobPodsTab
      .findRayClusterPodsSection()
      .should('contain', 'ray-data-processing-raycluster-worker-1');
  });

  it('should show empty state for completed job with no cluster pods', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-completed-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Pods');

    rayJobPodsTab
      .findRayClusterPodsSection()
      .should('contain', 'The Ray cluster has been shut down.');
  });
});

describe('RayJob Logs Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display Job ID and download button for running job', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Logs');

    rayJobLogsTab.findJobId().should('contain', 'Job ID:');
    rayJobLogsTab.findDownloadButton().should('exist');
  });

  it('should display log viewer with content for running job', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-data-processing');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Logs');

    rayJobLogsTab.findLogViewer().should('exist');
    rayJobLogsTab.findLogViewer().should('contain', 'Sample RayJob driver log output');
  });

  it('should show empty state for completed job without head pod', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-completed-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Logs');

    rayJobLogsTab.findEmptyState().should('exist');
    rayJobLogsTab.findEmptyState().should('contain', 'The Ray cluster has been shut down.');
  });

  it('should show waiting state for initializing job', () => {
    modelTrainingGlobal.visit(projectName);

    const row = trainingJobTable.getTableRow('ray-pending-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.selectTab('Logs');

    rayJobLogsTab.findWaitingState().should('exist');
    rayJobLogsTab.findWaitingState().should('contain', 'The Ray cluster is initializing');
  });
});

describe('RayJob Status Modal', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should open status modal when clicking the status label on a running RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findTitle().should('be.visible');
    rayJobStatusModal.findStatusLabel().should('be.visible');
  });

  it('should display "Running" status label in the modal header for a running RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.getRayJobStatus('Running');
  });

  it('should display "Complete" status label for a succeeded RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-completed-job');
    trainingJobTable.getTableRow('ray-completed-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.getRayJobStatus('Complete');
  });

  it('should display "Failed" status and danger alert for a failed RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-failed-job');
    trainingJobTable.getTableRow('ray-failed-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.getRayJobStatus('Failed');
    rayJobStatusModal.findAlert('danger').should('exist');
    rayJobStatusModal
      .findAlertDescription()
      .should('contain', 'Ray job failed due to application error.');
  });

  it('should show Pause job button for a running RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findPauseJobButton().should('be.visible').should('contain', 'Pause job');
    rayJobStatusModal.findDeleteButton().should('be.visible');
    rayJobStatusModal.findCloseButton().should('be.visible');
  });

  it('should show Resume job button for a paused RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-suspended-job');
    trainingJobTable.getTableRow('ray-suspended-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findResumeJobButton().should('be.visible').should('contain', 'Resume job');
    rayJobStatusModal.findDeleteButton().should('be.visible');
  });

  it('should show only Close button for a completed RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-completed-job');
    trainingJobTable.getTableRow('ray-completed-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findCloseButton().should('be.visible');
    rayJobStatusModal.findDeleteButton().should('not.exist');
    rayJobStatusModal.findPauseJobButton().should('not.exist');
  });

  it('should show only Close button for a deleting RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-deleting-job');
    trainingJobTable.getTableRow('ray-deleting-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findCloseButton().should('be.visible');
    rayJobStatusModal.findDeleteButton().should('not.exist');
    rayJobStatusModal.findPauseJobButton().should('not.exist');
  });

  it('should show Delete but no Pause for a failed RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-failed-job');
    trainingJobTable.getTableRow('ray-failed-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findDeleteButton().should('be.visible');
    rayJobStatusModal.findPauseJobButton().should('not.exist');
  });

  it('should close modal when Close button is clicked', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.close();
    rayJobStatusModal.shouldBeOpen(false);
  });

  it('should open delete modal when Delete job button is clicked', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-failed-job');
    trainingJobTable.getTableRow('ray-failed-job').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findDeleteButton().click();

    deleteModal.shouldBeOpen();
  });

  it('should open pause modal when Pause job button is clicked from status modal', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-data-processing');
    trainingJobTable.getTableRow('ray-data-processing').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.findPauseJobButton().click();

    rayJobStatusModal.shouldBeOpen(false);
    pauseRayJobModal.shouldBeOpen();
  });

  it('should display warning alert for an inadmissible Kueue RayJob', () => {
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.filterByName('ray-inadmissible-kueue');
    trainingJobTable.getTableRow('ray-inadmissible-kueue').findStatus().click();

    rayJobStatusModal.shouldBeOpen();
    rayJobStatusModal.getRayJobStatus('Inadmissible');
    rayJobStatusModal.findAlert('warning').should('exist');
  });
});
