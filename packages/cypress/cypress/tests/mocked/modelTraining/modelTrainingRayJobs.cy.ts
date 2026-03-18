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
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import {
  ClusterQueueModel,
  LocalQueueModel,
  RayClusterModel,
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
  rayJobDetailsTab,
  rayJobResourcesTab,
  editRayJobNodeCountModal,
} from '../../../pages/modelTraining';
import { tablePagination } from '../../../pages/components/Pagination';
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

    cy.findByRole('menuitem', { name: 'Delete job' }).should('exist');
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
