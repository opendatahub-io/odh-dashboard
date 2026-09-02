import {
  recreateOpenShiftProject,
  deleteOpenShiftProjectBestEffort,
} from '../../../../utils/oc_commands/project';
import { retryableBefore, wasSetupPerformed } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import {
  setupKueueModelDeploymentResources,
  pollUntilWorkloadAdmitted,
  pollUntilAnyWorkloadMessageMatches,
} from '../../../../utils/oc_commands/kueueModelDeployment';
import {
  cleanupKueueWorkbenchResources,
  type KueueWorkbenchConfig,
} from '../../../../utils/oc_commands/kueueWorkbench';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../../pages/modelServing';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';

const describeAdminOnly = Cypress.env('IS_NON_ADMIN_RUN') ? describe.skip : describe;
const TAB_READY_TIMEOUT = 120000;
const QUEUE_POSITION_REGEX = /\d+(st|nd|rd|th) in/;
const INADMISSIBLE_MESSAGE = /> maximum capacity \(0\)/i;
const QUEUED_MESSAGE = /insufficient unused quota/i;
const TEST_TAGS = ['@Kueue', '@Dashboard', '@ModelServing', '@Featureflagged', '@NonConcurrent'];

const FIXTURE = {
  projectName: 'kueue-md-proj',
  flavorName: 'lifecycle-model-flavor',
  clusterQueueName: 'lifecycle-model-cluster-queue',
  localQueueName: 'lifecycle-model-queue',
  hardwareProfileName: 'kueue-lifecycle-model-hp',
  hardwareProfileDisplayName: 'Kueue Lifecycle Model Profile',
  inadmissibleCpuQuota: 0,
  inadmissibleMemoryQuota: 0,
  inadmissibleStatus: 'Inadmissible',
  queuedCpuQuota: 3,
  queuedMemoryQuota: 9,
  queuedStatus: 'Queued',
  waitingForQuotaMessage: 'Waiting for quota',
  sectionTab: 'model-server',
  modelLocationURI: 'hf://facebook/opt-125m',
  servingRuntime: 'vLLM CPU (x86) ServingRuntime for KServe',
  deploymentMethod: 'legacy' as const,
  connectionNameSuffix: '-connection',
};

type TestContext = {
  testData: KueueWorkbenchConfig;
  projectName: string;
};

const buildKueueConfig = (
  uuid: string,
  cpuQuota: number,
  memoryQuota: number,
): KueueWorkbenchConfig => ({
  flavorName: `${FIXTURE.flavorName}-${uuid}`,
  clusterQueueName: `${FIXTURE.clusterQueueName}-${uuid}`,
  localQueueName: `${FIXTURE.localQueueName}-${uuid}`,
  hardwareProfileName: `${FIXTURE.hardwareProfileName}-${uuid}`,
  hardwareProfileDisplayName: `${FIXTURE.hardwareProfileDisplayName} ${uuid}`,
  cpuQuota,
  memoryQuota,
});

const assertModelServingAvailable = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('administrator must first select a model serving platform')) {
      throw new Error(
        'Model serving platform is not enabled on this cluster. Enable single-model (KServe) serving under Settings → Model serving before running this test.',
      );
    }
    if ($body.find('[data-testid="unauthorized-error"]').length > 0) {
      throw new Error('Current user is not authorized to view model deployments for this project.');
    }
  });
};

/** Fresh projects must pick KServe before Deploy is available — same as other model E2E specs. */
const selectKservePlatformIfNeeded = () => {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="kserve-select-button"]').length > 0) {
      projectDetails.findSelectPlatformButton('kserve').should('be.visible').click();
    }
  });
};

const waitForDeployModelButton = (timeout = TAB_READY_TIMEOUT) => {
  cy.findByTestId('section-model-server', { timeout }).should('exist');
  assertModelServingAvailable();
  selectKservePlatformIfNeeded();
  modelServingGlobal.findDeployModelButton().should('be.visible', { timeout });
};

const waitForDeploymentsTable = (timeout = TAB_READY_TIMEOUT) => {
  cy.findByTestId('section-model-server', { timeout }).should('exist');
  assertModelServingAvailable();
  modelServingSection.findDeploymentsTable().should('be.visible', { timeout });
};

/** First visit: same navigation pattern as testDeployLLMDServing / testWorkbenchKueueLifecycle. */
const openModelServerTabForDeploy = (ctx: TestContext) => {
  cy.visitWithLogin('/?devFeatureFlags=true', LDAP_ADMIN_USER);
  projectListPage.navigate();
  projectListPage.filterProjectByName(ctx.projectName);
  projectListPage.findProjectLink(ctx.projectName).click();
  projectDetails.findSectionTab(FIXTURE.sectionTab).click();
  waitForDeployModelButton();
};

/** Revisit after a model exists — wait for the deployments table, not the deploy empty state. */
const openModelServerTabForVerification = (ctx: TestContext) => {
  cy.visitWithLogin(
    `/projects/${ctx.projectName}?section=${FIXTURE.sectionTab}&devFeatureFlags=true`,
    LDAP_ADMIN_USER,
  );
  waitForDeploymentsTable();
};

const deployModelViaWizard = (ctx: TestContext, modelName: string) => {
  cy.get('body').type('{esc}');
  waitForDeployModelButton();
  modelServingGlobal.findDeployModelButton().should('be.visible').click();

  modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
  modelServingWizard.findUrilocationInput().clear().type(FIXTURE.modelLocationURI);
  modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
  modelServingWizard
    .findSaveConnectionInput()
    .clear()
    .type(`${modelName}${FIXTURE.connectionNameSuffix}`);
  modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
  modelServingWizard.findResourceNameButton().click();
  modelServingWizard.findResourceNameInput().should('be.visible');
  modelServingWizard.selectDeploymentMethodByKey(FIXTURE.deploymentMethod);
  modelServingWizard.selectPotentiallyDisabledProfile(
    ctx.testData.hardwareProfileDisplayName,
    ctx.testData.hardwareProfileName,
  );
  modelServingWizard
    .findHardProfileSelection()
    .should('contain.text', ctx.testData.hardwareProfileDisplayName);
  modelServingWizard.selectServingRuntimeOption(FIXTURE.servingRuntime);
  modelServingWizard.findNextButton().should('be.enabled').click();
  modelServingWizard.findNextButton().click();
  modelServingWizard.findSubmitButton().click();

  modelServingSection
    .getKServeRow(modelName)
    .find()
    .findByTestId('deployed-model-name', { timeout: TAB_READY_TIMEOUT })
    .should('contain.text', modelName);
};

const verifyKueueStatusAndResourcesModal = (
  ctx: TestContext,
  modelName: string,
  expectedStatus: string,
  expectWaitingForQuota: boolean,
) => {
  const row = modelServingSection.getKServeRow(modelName);
  row.findStatusLabel(expectedStatus, TAB_READY_TIMEOUT);

  if (expectWaitingForQuota) {
    row.findStatusSubtitle().should(($el) => {
      const text = $el.text();
      expect(
        text.includes(FIXTURE.waitingForQuotaMessage) || QUEUE_POSITION_REGEX.test(text),
      ).to.eq(true);
    });
  } else {
    row.findStatusSubtitle().invoke('text').should('match', QUEUE_POSITION_REGEX);
  }

  row.findStatusLabel().click();
  cy.findByTestId('deployment-status-modal').should('be.visible');
  cy.findByTestId('deployment-status-resources-tab').click();
  cy.findByTestId('cluster-queue-section').should('be.visible');
  cy.findByTestId('queue-value').should('contain.text', ctx.testData.clusterQueueName);
  cy.findByTestId('quotas-section').should('be.visible');
  cy.findByTestId('deployment-status-modal').find('[aria-label="Close"]').click();
};

const setupProject = (
  projectSuffix: string,
  uuid: string,
  cpuQuota: number,
  memoryQuota: number,
): Cypress.Chainable<TestContext> => {
  const ctx: TestContext = {
    projectName: `${FIXTURE.projectName}-${projectSuffix}-${uuid}`,
    testData: buildKueueConfig(uuid, cpuQuota, memoryQuota),
  };
  return recreateOpenShiftProject(ctx.projectName)
    .then(() => setupKueueModelDeploymentResources(ctx.testData, ctx.projectName))
    .then(() => ctx);
};

describeAdminOnly('Model deployment Kueue status tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("Cannot read properties of undefined (reading 'data')")) {
        return false;
      }
      return undefined;
    });
  });

  describe('Inadmissible with zero quota', () => {
    let ctx: TestContext;
    const uuid = generateTestUUID();
    const modelName = `kueue-md-inad-${uuid}`;

    retryableBefore(() =>
      setupProject(
        'inad',
        uuid,
        FIXTURE.inadmissibleCpuQuota,
        FIXTURE.inadmissibleMemoryQuota,
      ).then((projectCtx) => {
        ctx = projectCtx;
      }),
    );

    after(() => {
      if (!wasSetupPerformed()) {
        return;
      }
      cleanupKueueWorkbenchResources(ctx.testData, ctx.projectName);
      deleteOpenShiftProjectBestEffort(ctx.projectName);
    });

    it(
      'Verify model deployment shows Inadmissible when ClusterQueue quota is zero',
      { tags: TEST_TAGS },
      () => {
        openModelServerTabForDeploy(ctx);
        deployModelViaWizard(ctx, modelName);
        pollUntilAnyWorkloadMessageMatches(ctx.projectName, INADMISSIBLE_MESSAGE);
        openModelServerTabForVerification(ctx);
        verifyKueueStatusAndResourcesModal(ctx, modelName, FIXTURE.inadmissibleStatus, false);
      },
    );
  });

  describe('Queued when quota is fully consumed', () => {
    let ctx: TestContext;
    const uuid = generateTestUUID();
    const firstModelName = `kueue-md-q1-${uuid}`;
    const secondModelName = `kueue-md-q2-${uuid}`;

    retryableBefore(() =>
      setupProject('queued', uuid, FIXTURE.queuedCpuQuota, FIXTURE.queuedMemoryQuota).then(
        (projectCtx) => {
          ctx = projectCtx;
        },
      ),
    );

    after(() => {
      if (!wasSetupPerformed()) {
        return;
      }
      cleanupKueueWorkbenchResources(ctx.testData, ctx.projectName);
      deleteOpenShiftProjectBestEffort(ctx.projectName);
    });

    it(
      'Verify model deployment shows Queued when ClusterQueue quota is consumed by another deployment',
      { tags: TEST_TAGS },
      () => {
        openModelServerTabForDeploy(ctx);
        deployModelViaWizard(ctx, firstModelName);
        pollUntilWorkloadAdmitted(ctx.projectName, { maxAttempts: 120, pollIntervalMs: 5000 });
        openModelServerTabForVerification(ctx);
        deployModelViaWizard(ctx, secondModelName);
        pollUntilAnyWorkloadMessageMatches(ctx.projectName, QUEUED_MESSAGE);
        openModelServerTabForVerification(ctx);
        verifyKueueStatusAndResourcesModal(ctx, secondModelName, FIXTURE.queuedStatus, true);
      },
    );
  });
});
