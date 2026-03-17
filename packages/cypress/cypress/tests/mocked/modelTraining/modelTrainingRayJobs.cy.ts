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
import {
  ClusterQueueModel,
  LocalQueueModel,
  RayClusterModel,
  RayJobModel,
  TrainJobModel,
} from '@odh-dashboard/internal/api/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  rayJobDetailsDrawer,
  rayJobDetailsTab,
  rayJobResourcesTab,
} from '../../../pages/modelTraining';
import { ProjectModel } from '../../../utils/models';

const projectName = 'test-rayjobs-project';
const projectDisplayName = 'Test RayJobs Project';

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
]);

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
    trainingJobTable.findRows().should('have.length', 7);
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
    trainingJobTable.findRows().should('have.length', 8);
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
