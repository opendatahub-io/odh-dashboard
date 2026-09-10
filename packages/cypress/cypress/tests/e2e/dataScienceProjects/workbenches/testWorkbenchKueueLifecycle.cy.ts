import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  createOpenShiftProject,
} from '../../../../utils/oc_commands/project';
import { retryableBefore, wasSetupPerformed } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadKueueWorkbenchLifecycleFixture } from '../../../../utils/dataLoader';
import {
  setupKueueWorkbenchResources,
  cleanupKueueWorkbenchResources,
  updateClusterQueueQuota,
  type KueueWorkbenchConfig,
} from '../../../../utils/oc_commands/kueueWorkbench';
import {
  pollUntilWorkloadAdmitted,
  pollUntilAnyWorkloadMessageMatches,
} from '../../../../utils/oc_commands/kueueModelDeployment';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '../../../../pages/workbench';
import { selectNotebookImageWithBackendFallback } from '../../../../utils/oc_commands/imageStreams';
import type { KueueWorkbenchLifecycleTestData } from '../../../../types';

const QUEUE_POSITION_REGEX = /\d+(st|nd|rd|th) in/;
const QUEUED_MESSAGE = /insufficient unused quota/i;

type WorkbenchLifecycleContext = {
  uuid: string;
  testData: KueueWorkbenchConfig;
  fixtureData: KueueWorkbenchLifecycleTestData;
  projectName: string;
  sectionTab: string;
  notebookImage: string;
};

const buildKueueConfig = (
  data: KueueWorkbenchLifecycleTestData,
  uuid: string,
  resourceSuffix: string,
  cpuQuota: number,
  memoryQuota: number,
): KueueWorkbenchConfig => ({
  flavorName: `${data.flavorName}${resourceSuffix}-${uuid}`,
  clusterQueueName: `${data.clusterQueueName}${resourceSuffix}-${uuid}`,
  localQueueName: `${data.localQueueName}${resourceSuffix}-${uuid}`,
  hardwareProfileName: `${data.hardwareProfileName}${resourceSuffix}-${uuid}`,
  hardwareProfileDisplayName: resourceSuffix
    ? `${data.hardwareProfileDisplayName} Queued ${uuid}`
    : `${data.hardwareProfileDisplayName} ${uuid}`,
  cpuQuota,
  memoryQuota,
});

const initLifecycleProject = (
  data: KueueWorkbenchLifecycleTestData,
  projectSuffix: string,
  resourceSuffix: string,
  cpuQuota: number,
  memoryQuota: number,
): Cypress.Chainable<WorkbenchLifecycleContext> => {
  const uuid = generateTestUUID();
  const ctx: WorkbenchLifecycleContext = {
    uuid,
    fixtureData: data,
    projectName: `${data.projectName}${projectSuffix}-${uuid}`,
    sectionTab: data.sectionTab,
    notebookImage: data.notebookImage,
    testData: buildKueueConfig(data, uuid, resourceSuffix, cpuQuota, memoryQuota),
  };

  return deleteOpenShiftProject(ctx.projectName, { wait: true, ignoreNotFound: true })
    .then(() => createOpenShiftProject(ctx.projectName))
    .then(() => setupKueueWorkbenchResources(ctx.testData, ctx.projectName))
    .then(() => ctx);
};

const setupLifecycleProject = (
  projectSuffix: string,
  resourceSuffix: string,
  useQueuedQuota: boolean,
): Cypress.Chainable<WorkbenchLifecycleContext> =>
  loadKueueWorkbenchLifecycleFixture('e2e/kueueWorkbench/testKueueWorkbenchLifecycle.yaml').then(
    (data) =>
      initLifecycleProject(
        data,
        projectSuffix,
        resourceSuffix,
        useQueuedQuota ? data.queuedCpuQuota : data.cpuQuota,
        useQueuedQuota ? data.queuedMemoryQuota : data.memoryQuota,
      ),
  );

const openWorkbenchesTab = (ctx: WorkbenchLifecycleContext) => {
  cy.visitWithLogin('/?devFeatureFlags=true', LDAP_ADMIN_USER);
  projectListPage.navigate();
  projectListPage.filterProjectByName(ctx.projectName);
  projectListPage.findProjectLink(ctx.projectName).click();
  projectDetails.findSectionTab(ctx.sectionTab).click();
};

const createWorkbench = (ctx: WorkbenchLifecycleContext, workbenchName: string) => {
  workbenchPage.findCreateButton().click();
  createSpawnerPage.getNameInput().fill(workbenchName);
  selectNotebookImageWithBackendFallback(ctx.notebookImage, createSpawnerPage);
  createSpawnerPage
    .findHardwareProfileSelect()
    .should('contain.text', ctx.testData.hardwareProfileDisplayName);
  createSpawnerPage.findSubmitButton().click();
  workbenchPage.findNotebookTable(30000).should('exist');
};

const verifyResourcesModal = (clusterQueueName: string) => {
  workbenchStatusModal.find().should('be.visible');
  workbenchStatusModal.findResourcesTab().click();
  workbenchStatusModal.findClusterQueueSection().should('be.visible');
  workbenchStatusModal.findQueueValue().should('contain.text', clusterQueueName);
  workbenchStatusModal.findQuotasSection().should('be.visible');
  workbenchStatusModal.getModalCloseButton().click();
};

describe('Workbench Kueue Lifecycle Tests', () => {
  describe('Inadmissible with zero quota', () => {
    let ctx: WorkbenchLifecycleContext | undefined;

    retryableBefore(() =>
      setupLifecycleProject('', '', false).then((projectCtx) => {
        ctx = projectCtx;
      }),
    );

    after(() => {
      if (!wasSetupPerformed() || !ctx) {
        return;
      }
      cleanupKueueWorkbenchResources(ctx.testData, ctx.projectName);
      deleteOpenShiftProject(ctx.projectName, { wait: false, ignoreNotFound: true });
    });

    it(
      'Verify workbench Kueue lifecycle: Inadmissible → Ready after quota update',
      { tags: ['@Kueue', '@Dashboard', '@Workbenches', '@Featureflagged'] },
      () => {
        const workbenchName = `kueue-lifecycle-wb-${ctx.uuid}`;

        openWorkbenchesTab(ctx);
        createWorkbench(ctx, workbenchName);

        const notebookRow = workbenchPage.getNotebookRow(workbenchName);
        notebookRow.expectStatusLabelToBe('Inadmissible', 120000);
        notebookRow
          .findNotebookStatusSubtitle()
          .should('contain.text', ctx.fixtureData.exceededQuotaMessage);

        notebookRow.findHaveNotebookStatusText().click();
        verifyResourcesModal(ctx.testData.clusterQueueName);

        updateClusterQueueQuota(
          ctx.testData.clusterQueueName,
          ctx.fixtureData.updatedCpuQuota,
          ctx.fixtureData.updatedMemoryQuota,
        );

        notebookRow.expectStatusLabelToBe('Ready', 300000);
        notebookRow.shouldHaveHardwareProfile(ctx.testData.hardwareProfileDisplayName);
      },
    );
  });

  describe('Queued when ClusterQueue quota is partially consumed', () => {
    let ctx: WorkbenchLifecycleContext | undefined;

    retryableBefore(() =>
      setupLifecycleProject('-q', '-queued', true).then((projectCtx) => {
        ctx = projectCtx;
      }),
    );

    after(() => {
      if (!wasSetupPerformed() || !ctx) {
        return;
      }
      cleanupKueueWorkbenchResources(ctx.testData, ctx.projectName);
      deleteOpenShiftProject(ctx.projectName, { wait: false, ignoreNotFound: true });
    });

    it(
      'Verify workbench shows Queued when ClusterQueue quota is consumed by another workbench',
      {
        tags: ['@Kueue', '@Dashboard', '@Workbenches', '@Featureflagged', '@NonConcurrent'],
      },
      () => {
        const firstWorkbenchName = `kueue-wb-q1-${ctx.uuid}`;
        const secondWorkbenchName = `kueue-wb-q2-${ctx.uuid}`;

        openWorkbenchesTab(ctx);
        createWorkbench(ctx, firstWorkbenchName);
        pollUntilWorkloadAdmitted(ctx.projectName, { maxAttempts: 120, pollIntervalMs: 5000 });

        createWorkbench(ctx, secondWorkbenchName);
        pollUntilAnyWorkloadMessageMatches(ctx.projectName, QUEUED_MESSAGE);

        const notebookRow = workbenchPage.getNotebookRow(secondWorkbenchName);
        notebookRow.expectStatusLabelToBe('Queued', 120000);
        notebookRow.findNotebookStatusSubtitle().should(($el) => {
          const text = $el.text();
          expect(
            text.includes(ctx.fixtureData.waitingForQuotaMessage) ||
              QUEUE_POSITION_REGEX.test(text),
          ).to.eq(true);
        });

        notebookRow.findHaveNotebookStatusText().click();
        verifyResourcesModal(ctx.testData.clusterQueueName);
      },
    );
  });
});
