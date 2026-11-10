import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { loadInfrastructureWorkloadsFixture } from '../../../utils/dataLoader';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { isKueueUnmanaged } from '../../../utils/oc_commands/dsc';
import {
  cleanupInfrastructureWorkloadsResources,
  setupInfrastructureWorkloadsHardwareProfile,
  setupInfrastructureWorkloadsResources,
  type InfrastructureWorkloadsConfig,
} from '../../../utils/oc_commands/infrastructureWorkloads';
import {
  addUserToProject,
  createOpenShiftProject,
  deleteOpenShiftProject,
  deleteOpenShiftProjectBestEffort,
} from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { infrastructurePage } from '../../../pages/infrastructure';
import { projectDetails, projectListPage } from '../../../pages/projects';
import { createSpawnerPage, workbenchPage } from '../../../pages/workbench';
import { selectNotebookImageWithBackendFallback } from '../../../utils/oc_commands/imageStreams';
import { NotebookStatusLabel, type InfrastructureWorkloadsTestData } from '../../../types';

const describeAdminOnly = Cypress.env('IS_NON_ADMIN_RUN') ? describe.skip : describe;

type TestContext = {
  managedProjectName: string;
  nonKueueProjectName: string;
  emptyProjectName: string;
  managedProjectWorkbenchName: string;
  nonKueueProjectWorkbenchName: string;
  config: InfrastructureWorkloadsConfig;
  testData: InfrastructureWorkloadsTestData;
};

const buildTestContext = (testData: InfrastructureWorkloadsTestData, uuid: string): TestContext => {
  const withUuid = (name: string): string => `${name}-${uuid}`;
  return {
    managedProjectName: withUuid(testData.managedProjectName),
    nonKueueProjectName: withUuid(testData.nonKueueProjectName),
    emptyProjectName: withUuid(testData.emptyProjectName),
    managedProjectWorkbenchName: withUuid(testData.managedProjectWorkbenchName),
    nonKueueProjectWorkbenchName: withUuid(testData.nonKueueProjectWorkbenchName),
    config: {
      managedProjectName: withUuid(testData.managedProjectName),
      trainJobName: withUuid(testData.trainJobName),
      trainingRuntimeName: withUuid(testData.trainingRuntimeName),
      hardwareProfileName: withUuid(testData.hardwareProfileName),
      resourceFlavorName: withUuid(testData.resourceFlavorName),
      clusterQueueName: withUuid(testData.clusterQueueName),
      localQueueName: withUuid(testData.localQueueName),
      initialCpuQuota: testData.initialCpuQuota,
      memoryQuota: testData.memoryQuota,
    },
    testData,
  };
};

const createPrerequisiteWorkbench = (
  projectName: string,
  workbenchName: string,
  testData: InfrastructureWorkloadsTestData,
  hardwareProfileName: string,
): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.step(`Create prerequisite Workbench ${workbenchName} in ${projectName}`);
  projectListPage.navigate();
  projectListPage.filterProjectByName(projectName);
  projectListPage.findProjectLink(projectName).click();
  projectDetails.findSectionTab('workbenches').click();
  workbenchPage.findCreateButton().click();
  createSpawnerPage.getNameInput().fill(workbenchName);
  selectNotebookImageWithBackendFallback(testData.notebookImage, createSpawnerPage);
  createSpawnerPage.selectHardwareProfile(hardwareProfileName);
  createSpawnerPage.findSubmitButton().click();

  return workbenchPage
    .getNotebookRow(workbenchName)
    .findHaveNotebookStatusText(300000)
    .should('have.text', NotebookStatusLabel.Ready);
};

const setupTestResources = (context: TestContext): Cypress.Chainable<TestContext> => {
  return ensureAdminOcSession()
    .then(() =>
      deleteOpenShiftProject(context.managedProjectName, {
        wait: true,
        ignoreNotFound: true,
      }),
    )
    .then(() =>
      deleteOpenShiftProject(context.nonKueueProjectName, {
        wait: true,
        ignoreNotFound: true,
      }),
    )
    .then(() =>
      deleteOpenShiftProject(context.emptyProjectName, { wait: true, ignoreNotFound: true }),
    )
    .then(() => createOpenShiftProject(context.managedProjectName))
    .then(() => createOpenShiftProject(context.nonKueueProjectName))
    .then(() => createOpenShiftProject(context.emptyProjectName))
    .then(() =>
      addUserToProject(context.managedProjectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit'),
    )
    .then(() =>
      addUserToProject(context.nonKueueProjectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit'),
    )
    .then(() => addUserToProject(context.emptyProjectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit'))
    .then(() => setupInfrastructureWorkloadsHardwareProfile(context.config.hardwareProfileName))
    .then(() => cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER))
    .then(() =>
      createPrerequisiteWorkbench(
        context.managedProjectName,
        context.managedProjectWorkbenchName,
        context.testData,
        context.config.hardwareProfileName,
      ),
    )
    .then(() =>
      createPrerequisiteWorkbench(
        context.nonKueueProjectName,
        context.nonKueueProjectWorkbenchName,
        context.testData,
        context.config.hardwareProfileName,
      ),
    )
    .then(() => setupInfrastructureWorkloadsResources(context.config))
    .then(() => context);
};

describeAdminOnly('Infrastructure Workloads visibility', () => {
  const uuid = generateTestUUID();
  let context: TestContext | undefined;

  before(() => {
    cy.step('Verify Kueue is managed outside the DataScienceCluster');
    isKueueUnmanaged().should('equal', true);
  });

  retryableBefore(() =>
    loadInfrastructureWorkloadsFixture('e2e/kueueWorkloads/testInfrastructureWorkloads.yaml').then(
      (testData) => {
        context = buildTestContext(testData, uuid);
        return setupTestResources(context);
      },
    ),
  );

  after(() => {
    if (!context) {
      return;
    }
    ensureAdminOcSession();
    cleanupInfrastructureWorkloadsResources(context.config);
    deleteOpenShiftProjectBestEffort(context.managedProjectName);
    deleteOpenShiftProjectBestEffort(context.nonKueueProjectName);
    deleteOpenShiftProjectBestEffort(context.emptyProjectName);
  });

  it(
    'shows managed and non-Kueue workloads to a project user',
    { tags: ['@Kueue', '@Dashboard', '@Infrastructure', '@Featureflagged', '@GpuaasCI'] },
    () => {
      if (!context) {
        throw new Error('Test setup did not complete');
      }
      const testContext = context;
      const { config, testData } = testContext;

      cy.step('Open Workloads as a project user and verify admin tabs stay hidden');
      cy.visitWithLogin('/observe-and-monitor/infrastructure', LDAP_CONTRIBUTOR_USER);
      infrastructurePage.findWorkloadsTab().should('be.visible');
      infrastructurePage.findUtilizationTab().should('not.exist');
      infrastructurePage.findQuotaUsageTab().should('not.exist');

      cy.step('Select the Kueue-managed project and verify both workload types');
      infrastructurePage.selectProjectByName(testContext.managedProjectName);
      infrastructurePage
        .findWorkloadRow(config.trainJobName, { timeout: 120000 })
        .scrollIntoView()
        .should('be.visible');
      infrastructurePage
        .findWorkloadRow(testContext.managedProjectWorkbenchName, { timeout: 120000 })
        .scrollIntoView()
        .should('be.visible');
      infrastructurePage
        .findWorkloadWorkbenchStatus(testContext.managedProjectWorkbenchName)
        .should('have.text', NotebookStatusLabel.Ready);
      infrastructurePage
        .findWorkloadQueuePosition(testContext.managedProjectWorkbenchName)
        .should('have.text', testData.nonKueueLabel);
      infrastructurePage
        .findWorkloadPriorityClass(testContext.managedProjectWorkbenchName)
        .should('have.text', testData.nonKueueLabel);
      infrastructurePage
        .findWorkloadQueuePosition(config.trainJobName)
        .should('have.text', String(testData.expectedQueuePosition));

      cy.step('Verify Admissions stays hidden for a project user');
      infrastructurePage.findWorkloadOverview().should('be.visible');
      infrastructurePage.findAdmissionsTab().should('not.exist');

      cy.step('Switch to the non-Kueue project and verify its Workbench remains visible');
      infrastructurePage.selectProjectByName(testContext.nonKueueProjectName);
      infrastructurePage
        .findWorkloadRow(testContext.nonKueueProjectWorkbenchName, { timeout: 120000 })
        .scrollIntoView()
        .should('be.visible');
      infrastructurePage
        .findWorkloadWorkbenchStatus(testContext.nonKueueProjectWorkbenchName)
        .should('have.text', NotebookStatusLabel.Ready);
      infrastructurePage
        .findWorkloadCount('active')
        .findByRole('heading', { level: 3 })
        .should('have.text', '1');
      infrastructurePage
        .findWorkloadCount('blockers')
        .findByRole('heading', { level: 3 })
        .should('have.text', '0');
      infrastructurePage
        .findWorkloadQueuePosition(testContext.nonKueueProjectWorkbenchName)
        .should('not.exist');
      infrastructurePage
        .findWorkloadPriorityClass(testContext.nonKueueProjectWorkbenchName)
        .should('not.exist');
      infrastructurePage
        .findWorkloadsTable()
        .should('not.contain.text', testData.priorityClassColumnLabel);
      infrastructurePage.findAdmissionsTab().should('not.exist');

      cy.step('Switch to the empty project and verify the empty state');
      infrastructurePage.selectProjectByName(testContext.emptyProjectName);
      infrastructurePage.findWorkloadsEmptyState().should('be.visible');
      infrastructurePage.findWorkloadsRefreshButton().should('be.visible');
    },
  );

  it(
    'shows all Infrastructure tabs and Admission metrics to an administrator',
    { tags: ['@Kueue', '@Dashboard', '@Infrastructure', '@Featureflagged', '@GpuaasCI'] },
    () => {
      if (!context) {
        throw new Error('Test setup did not complete');
      }
      const testContext = context;

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visitWithLogin('/observe-and-monitor/infrastructure', HTPASSWD_CLUSTER_ADMIN_USER);
      infrastructurePage.findUtilizationTab().should('be.visible');
      infrastructurePage.findQuotaUsageTab().should('be.visible');
      infrastructurePage.switchToWorkloadsTab();
      infrastructurePage.selectProjectByName(testContext.managedProjectName);
      infrastructurePage.findAdmissionsTab().should('be.visible').click();
      infrastructurePage.findWaitingWorkloadsMetric().should('be.visible');
      infrastructurePage.findActiveWorkloadsMetric().should('be.visible');
      infrastructurePage.findAdmissionRateMetric().should('be.visible');
      infrastructurePage.findAdmissionLeadTimeMetric().should('be.visible');
    },
  );
});
