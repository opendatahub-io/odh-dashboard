/* eslint-disable camelcase */
import { initIntercepts, projectName } from './modelTrainingRayJobsTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  rayJobDetailsDrawer,
  rayJobDetailsTab,
  rayJobResourcesTab,
  rayJobPodsTab,
  rayJobLogsTab,
} from '../../../pages/modelTraining';

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
