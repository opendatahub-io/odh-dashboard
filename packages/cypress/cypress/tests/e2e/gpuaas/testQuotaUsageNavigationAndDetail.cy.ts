import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { loadKueueQuotaUsageNavigationFixture } from '../../../utils/dataLoader';
import { isKueueUnmanaged } from '../../../utils/oc_commands/dsc';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  cleanupKueueQuotaUsageNavigationResources,
  setupKueueQuotaUsageNavigationResources,
  type KueueQuotaUsageNavigationConfig,
} from '../../../utils/oc_commands/kueueQuotaUsage';
import {
  createOpenShiftProject,
  deleteOpenShiftProject,
  deleteOpenShiftProjectBestEffort,
} from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { infrastructurePage } from '../../../pages/infrastructure';
import type { KueueQuotaUsageNavigationTestData } from '../../../types';

const describeAdminOnly = Cypress.env('IS_NON_ADMIN_RUN') ? describe.skip : describe;

const generateGrepTagsHash = (): string => {
  const grepTags = String(Cypress.env('grepTags') || 'local');
  let hash = 0;

  for (let i = 0; i < grepTags.length; i++) {
    hash = ((hash << 5) - hash + grepTags.charCodeAt(i)) | 0;
  }

  return Math.abs(hash).toString(36).slice(0, 6).padStart(6, '0');
};

type TestContext = {
  managedProjectName: string;
  nonKueueManagedProjectName: string;
  config: KueueQuotaUsageNavigationConfig;
  testData: KueueQuotaUsageNavigationTestData;
};

const buildTestContext = (
  testData: KueueQuotaUsageNavigationTestData,
  uuid: string,
): TestContext => {
  const withUuid = (name: string): string => `${name}-${uuid}`;

  return {
    managedProjectName: withUuid(testData.managedProjectName),
    nonKueueManagedProjectName: withUuid(testData.nonKueueManagedProjectName),
    config: {
      managedProjectName: withUuid(testData.managedProjectName),
      resourceFlavorName: withUuid(testData.resourceFlavorName),
      parentCohortName: withUuid(testData.parentCohortName),
      cohortName: withUuid(testData.cohortName),
      emptyCohortName: withUuid(testData.emptyCohortName),
      cohortClusterQueueName: withUuid(testData.cohortClusterQueueName),
      standaloneClusterQueueName: withUuid(testData.standaloneClusterQueueName),
      localQueueName: withUuid(testData.localQueueName),
      acceleratorResourceName: testData.acceleratorResourceName,
      acceleratorQuota: testData.acceleratorQuota,
    },
    testData,
  };
};

const setupTestResources = (context: TestContext): Cypress.Chainable<TestContext> => {
  return ensureAdminOcSession()
    .then(() =>
      deleteOpenShiftProject(context.managedProjectName, { wait: true, ignoreNotFound: true }),
    )
    .then(() =>
      deleteOpenShiftProject(context.nonKueueManagedProjectName, {
        wait: true,
        ignoreNotFound: true,
      }),
    )
    .then(() => createOpenShiftProject(context.managedProjectName))
    .then(() => createOpenShiftProject(context.nonKueueManagedProjectName))
    .then(() => setupKueueQuotaUsageNavigationResources(context.config))
    .then(() => context);
};

describeAdminOnly('Quota usage navigation and detail', () => {
  const uuid = `${generateTestUUID()}-${generateGrepTagsHash()}`;
  let context: TestContext | undefined;

  before(() => {
    cy.step('Verify Kueue is managed outside the DataScienceCluster');
    isKueueUnmanaged().should('equal', true);
  });

  retryableBefore(() =>
    loadKueueQuotaUsageNavigationFixture(
      'e2e/kueueQuotaUsage/testQuotaUsageNavigationAndDetail.yaml',
    ).then((testData) => {
      context = buildTestContext(testData, uuid);
      return setupTestResources(context);
    }),
  );

  after(() => {
    if (!context) {
      return;
    }

    ensureAdminOcSession();
    cleanupKueueQuotaUsageNavigationResources(context.config);
    deleteOpenShiftProjectBestEffort(context.managedProjectName);
    deleteOpenShiftProjectBestEffort(context.nonKueueManagedProjectName);
  });

  it(
    'displays cohort and cluster queue details and separates Kueue-managed projects',
    { tags: ['@Kueue', '@Dashboard', '@Infrastructure', '@Featureflagged', '@GpuaasCI'] },
    () => {
      if (!context) {
        throw new Error('Test setup did not complete');
      }
      const testContext = context;
      const {
        parentCohortName,
        cohortName,
        emptyCohortName,
        cohortClusterQueueName,
        standaloneClusterQueueName,
        resourceFlavorName,
      } = testContext.config;

      cy.step('Log in as an administrator and open Quota usage');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      infrastructurePage.findNavItem().should('be.visible').click();
      infrastructurePage.shouldHavePageTitle();
      infrastructurePage.switchToQuotaUsageTab();
      infrastructurePage.findQuotaUsageNavSearch().should('be.visible');

      cy.step('Verify parent cohort, child cohort, member queue, and standalone queue appear');
      infrastructurePage.findQuotaUsageTreeNode(parentCohortName).should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(cohortName).should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(emptyCohortName).should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(cohortClusterQueueName).should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(standaloneClusterQueueName).should('be.visible');

      cy.step('Collapse, expand, and search the hierarchy');
      infrastructurePage.findQuotaUsageCollapseAll().click();
      infrastructurePage.findQuotaUsageExpandAll().should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(cohortClusterQueueName).should('not.be.visible');
      infrastructurePage.findQuotaUsageExpandAll().click();
      infrastructurePage.findQuotaUsageTreeNode(cohortClusterQueueName).should('be.visible');
      infrastructurePage.findQuotaUsageNavSearch().clear().type(standaloneClusterQueueName);
      infrastructurePage.findQuotaUsageTreeNode(standaloneClusterQueueName).should('be.visible');
      infrastructurePage.findQuotaUsageTreeNode(cohortClusterQueueName).should('not.exist');
      infrastructurePage.findQuotaUsageNavSearch().clear();

      cy.step('Verify cohort detail displays the cohort badge, summary, and accelerator usage');
      infrastructurePage.findQuotaUsageTreeNode(cohortName).click();
      infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', parentCohortName);
      infrastructurePage.findQuotaUsageBreadcrumb().should('contain.text', cohortName);
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', cohortName);
      infrastructurePage
        .findQuotaUsageDetailTypeLabel()
        .should('contain.text', testContext.testData.cohortTypeLabel);
      infrastructurePage.findQuotaUsageSummarySection().should('be.visible');
      infrastructurePage.findQuotaUsageAcceleratorTableSection().should('be.visible');
      infrastructurePage.findQuotaUsageAcceleratorRow(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterCapacity(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterCompute(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterMemory(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageWorkloadsSection().should('not.exist');

      cy.step('Verify an empty cohort displays no accelerator usage data');
      infrastructurePage.findQuotaUsageTreeNode(emptyCohortName).click();
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', emptyCohortName);
      infrastructurePage
        .findQuotaUsageDetailTypeLabel()
        .should('contain.text', testContext.testData.cohortTypeLabel);
      infrastructurePage.findQuotaUsageDetailNoData().should('be.visible');
      infrastructurePage.findQuotaUsageWorkloadsSection().should('not.exist');

      cy.step('Verify the standalone queue displays its cluster queue detail');
      infrastructurePage.findQuotaUsageTreeNode(standaloneClusterQueueName).click();
      infrastructurePage
        .findQuotaUsageDetailTitle()
        .should('contain.text', standaloneClusterQueueName);
      infrastructurePage
        .findQuotaUsageDetailTypeLabel()
        .should('contain.text', testContext.testData.clusterQueueTypeLabel);
      infrastructurePage.findQuotaUsageSummarySection().should('be.visible');
      infrastructurePage.findQuotaUsageAcceleratorRow(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterCapacity(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterCompute(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageMeterMemory(resourceFlavorName).should('be.visible');

      cy.step('Verify the cohort member queue displays its breadcrumb and detail');
      infrastructurePage.findQuotaUsageTreeNode(cohortClusterQueueName).click();
      infrastructurePage.findQuotaUsageBreadcrumb().should('be.visible');
      infrastructurePage.findQuotaUsageBreadcrumbSegment(parentCohortName).should('be.visible');
      infrastructurePage.findQuotaUsageBreadcrumbSegment(cohortName).should('be.visible');
      infrastructurePage.findQuotaUsageDetailTitle().should('contain.text', cohortClusterQueueName);
      infrastructurePage
        .findQuotaUsageDetailTypeLabel()
        .should('contain.text', testContext.testData.clusterQueueTypeLabel);
      infrastructurePage.findQuotaUsageSummarySection().should('be.visible');
      infrastructurePage
        .findQuotaUsageSummaryWorkloads()
        .should('have.text', '0 active, 0 pending');
      infrastructurePage
        .findQuotaUsageSummaryCapacity()
        .should('contain.text', `0/${testContext.testData.acceleratorQuota}`);
      infrastructurePage.findQuotaUsageAcceleratorRow(resourceFlavorName).should('be.visible');
      infrastructurePage.findQuotaUsageWorkloadsSection().scrollIntoView().should('be.visible');
      infrastructurePage
        .findClusterQueueWorkloadsEmptyState()
        .scrollIntoView()
        .should('be.visible');

      cy.step('Verify the selected queue Kueue projects modal includes only the managed project');
      infrastructurePage.findQuotaUsageViewKueueProjectsLink().click();
      infrastructurePage.findKueueProjectsModal().should('be.visible');
      infrastructurePage.findKueueProjectsRow(testContext.managedProjectName).should('be.visible');
      infrastructurePage
        .findKueueProjectsRowStatusLabel(testContext.managedProjectName)
        .should('exist');
      infrastructurePage
        .findKueueProjectsRow(testContext.nonKueueManagedProjectName)
        .should('not.exist');
      infrastructurePage.findKueueProjectsCloseButton().click();
      infrastructurePage.findKueueProjectsModal().should('not.exist');

      cy.step('Verify the non-Kueue projects modal includes only the non-managed project');
      infrastructurePage.findInfrastructureKueueHelpLink().click();
      infrastructurePage.findViewNonKueueManagedProjectsLink().click();
      infrastructurePage.findNonKueueManagedProjectsModal().should('be.visible');
      infrastructurePage
        .findNonKueueManagedProjectsSearch()
        .clear()
        .type(testContext.nonKueueManagedProjectName);
      infrastructurePage
        .findNonKueueManagedProjectsRow(testContext.nonKueueManagedProjectName)
        .should('be.visible');
      infrastructurePage
        .findNonKueueManagedProjectsSearch()
        .clear()
        .type(testContext.managedProjectName);
      infrastructurePage
        .findNonKueueManagedProjectsRow(testContext.managedProjectName)
        .should('not.exist');
      infrastructurePage.findNonKueueManagedProjectsTable().should('be.visible');
      infrastructurePage.findNonKueueManagedProjectsCloseButton().click();
      infrastructurePage.findNonKueueManagedProjectsModal().should('not.exist');
    },
  );
});
