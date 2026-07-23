/* eslint-disable camelcase */
import { mockRayJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import { RayJobDeploymentStatus, RayJobStatusValue } from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mock404Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  GatewayConfigModel,
  GatewayModel,
  HTTPRouteModel,
  LocalQueueModel,
  RayJobModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import {
  initIntercepts,
  initPauseResumeIntercepts,
  projectName,
  projectDisplayName,
  runningWorkload,
  suspendedWorkload,
} from './modelTrainingRayJobsTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  rayJobDetailsDrawer,
  editRayJobNodeCountModal,
  pauseRayJobModal,
  rayJobStatusModal,
} from '../../../pages/modelTraining';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { ProjectModel } from '../../../utils/models';

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

  const initEditIntercepts = (): void => {
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

  it('should disable Pause toggle and kebab action for clusterSelector RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-workspace-job');

    const row = trainingJobTable.getTableRow('ray-workspace-job');
    row.findPauseResumeToggle().should('be.disabled');

    row.findKebabButton().click();
    row.findKebabMenuItem('Pause job').should('have.attr', 'aria-disabled', 'true');
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

  it('should show Pause job as aria-disabled in drawer kebab for clusterSelector RayJob', () => {
    modelTrainingGlobal.visit(projectName);
    trainingJobTable.filterByName('ray-workspace-job');

    const row = trainingJobTable.getTableRow('ray-workspace-job');
    row.findNameLink().click();

    rayJobDetailsDrawer.shouldBeOpen();
    rayJobDetailsDrawer.clickKebabMenu();
    rayJobDetailsDrawer.findKebabMenuItem('Pause job').should('have.attr', 'aria-disabled', 'true');
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

  it('should show Ray cluster name as a link on OcpRoute clusters using GatewayConfig status.domain', () => {
    const mockOcpRouteGateway = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'Gateway',
      metadata: {
        name: 'data-science-gateway',
        namespace: 'openshift-ingress',
      },
      spec: {
        listeners: [{ port: 443, name: 'https' }],
      },
    };

    const mockGatewayConfig = {
      apiVersion: 'services.platform.opendatahub.io/v1alpha1',
      kind: 'GatewayConfig',
      metadata: {
        name: 'default-gateway',
      },
      status: {
        domain: 'rh-ai.apps.example.com',
      },
    };

    cy.interceptK8s(
      { model: GatewayModel, name: 'data-science-gateway', ns: 'openshift-ingress' },
      mockOcpRouteGateway,
    );
    cy.interceptK8s({ model: GatewayConfigModel, name: 'default-gateway' }, mockGatewayConfig);
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
      .and(
        'eq',
        `https://rh-ai.apps.example.com/ray/${projectName}/ray-data-processing-raycluster/#/`,
      );
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
