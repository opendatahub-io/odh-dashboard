import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isRHOAI } from '../../../utils/oc_commands/applications';
import { ensureAdminOcSession, pollUntilSuccess } from '../../../utils/oc_commands/baseCommands';
import { featureStoreCreatePage } from '../../../pages/featureStore/featureStoreCreate';
import {
  featureStoreManagePage,
  deleteFeatureStoreModal,
} from '../../../pages/featureStore/featureStoreManage';

const DEV_FLAGS = 'devFeatureFlags=Feature+store+plugin%3Dtrue';
const APPLICATIONS_NAMESPACE = (): string => Cypress.env('APPLICATIONS_NAMESPACE') || 'opendatahub';
const DASHBOARD_CONFIG = 'odhdashboardconfig odh-dashboard-config';

const setFeatureStoreAdminFlag = (enabled: boolean): Cypress.Chainable<Cypress.Exec> => {
  const ns = APPLICATIONS_NAMESPACE();
  const patchJson = JSON.stringify({
    spec: { dashboardConfig: { featureStoreAdmin: enabled } },
  });
  return cy
    .exec(`oc patch ${DASHBOARD_CONFIG} -n ${ns} --type=merge -p '${patchJson}'`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(`Failed to set featureStoreAdmin to ${enabled}: ${result.stderr}`);
      }
      if (enabled) {
        return pollUntilSuccess(
          `oc get ${DASHBOARD_CONFIG} -n ${ns} -o json | jq -e '.spec.dashboardConfig.featureStoreAdmin == true'`,
          'featureStoreAdmin flag to be true',
          { maxAttempts: 30, pollIntervalMs: 2000 },
        );
      }
      return pollUntilSuccess(
        `oc get ${DASHBOARD_CONFIG} -n ${ns} -o json | jq -e '.spec.dashboardConfig.featureStoreAdmin == false'`,
        'featureStoreAdmin flag to be false',
        { maxAttempts: 30, pollIntervalMs: 2000 },
      );
    });
};

describe('Feature Store Admin Lifecycle (Create → Verify Ready → Delete)', () => {
  const uuid = generateTestUUID();
  const projectName = `fs-admin-e2e-${uuid}`;
  let skipTest = false;
  let adminFlagWasAlreadyEnabled = false;

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping — Feature Store is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

  retryableBefore(() => {
    ensureAdminOcSession();

    cy.step('Check if the operator is RHOAI');
    isRHOAI().then((rhoai) => {
      if (!rhoai) {
        skipTest = true;
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.step('Check if featureStoreAdmin flag is already enabled');
      cy.exec(
        `oc get ${DASHBOARD_CONFIG} -n ${APPLICATIONS_NAMESPACE()} -o json | jq -e '.spec.dashboardConfig.featureStoreAdmin == true'`,
        { failOnNonZeroExit: false },
      ).then((result) => {
        if (result.exitCode === 0) {
          adminFlagWasAlreadyEnabled = true;
        } else if (result.exitCode !== 1) {
          throw new Error(
            `Unexpected error querying featureStoreAdmin flag (exit ${result.exitCode}): ${result.stderr}`,
          );
        }
      });

      cy.then(() => {
        cy.step(`Create namespace: ${projectName}`);
        createCleanProject(projectName);
      });

      cy.then(() => {
        if (!adminFlagWasAlreadyEnabled) {
          cy.step('Enable featureStoreAdmin flag');
          setFeatureStoreAdminFlag(true);
        }
      });
    });
  });

  after(() => {
    if (!wasSetupPerformed() || shouldSkip()) {
      cy.log('Skipping cleanup');
      return;
    }

    ensureAdminOcSession();

    cy.step(`Delete namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    if (!adminFlagWasAlreadyEnabled) {
      cy.step('Restore featureStoreAdmin flag to disabled');
      setFeatureStoreAdminFlag(false);
    }
  });

  it(
    'Creates a feature store via the wizard, verifies it becomes Ready on the manage page, and deletes it',
    {
      tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@Sanity'],
      retries: { runMode: 1, openMode: 0 },
    },
    () => {
      if (shouldSkip()) {
        return;
      }

      const storeName = `e2e-store-${generateTestUUID()}`;

      // ── Step 1: Create via wizard ──────────────────────────────────────
      cy.step('Navigate to the create page');
      cy.visitWithLogin(
        `/develop-train/feature-store/create?${DEV_FLAGS}`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );
      cy.findByTestId('app-page-title').should('have.text', 'Create feature store');

      cy.step('Fill in Details step');
      featureStoreCreatePage.fillProjectName(storeName);
      featureStoreCreatePage.selectNamespace(projectName);
      featureStoreCreatePage.findNextButton().should('not.be.disabled');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Registry step');
      featureStoreCreatePage.findStepByName('Registry').should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Online & offline stores step');
      featureStoreCreatePage
        .findStepByName('Online & offline stores')
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Advanced options step');
      featureStoreCreatePage
        .findStepByName('Advanced options')
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Submit on Review step');
      featureStoreCreatePage.findStepByName('Review').should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.findSubmitButton().should('not.be.disabled');
      featureStoreCreatePage.findSubmitButton().click();

      cy.step('Verify redirect to deployment progress page');
      cy.url({ timeout: 15000 }).should('include', '/create/deploy/');

      // ── Step 2: Wait for FeatureStore CR to be Ready ───────────────────
      cy.step('Wait for FeatureStore CR to reach Ready phase');
      pollUntilSuccess(
        `oc get featurestores.feast.dev ${storeName} -n ${projectName} -o jsonpath='{.status.phase}' | grep -q '^Ready$'`,
        `FeatureStore/${storeName} to be Ready`,
        { maxAttempts: 60, pollIntervalMs: 5000 },
      );

      // ── Step 3: Verify on the manage page ──────────────────────────────
      cy.step('Navigate to the manage page');
      cy.visitWithLogin(
        `/settings/environment-setup/feature-stores?${DEV_FLAGS}`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );
      cy.findByTestId('app-page-title', { timeout: 15000 }).should(
        'contain.text',
        'Feature stores',
      );

      cy.step('Verify the store appears in the table');
      featureStoreManagePage.findTable().should('be.visible');
      featureStoreManagePage.findRowByName(projectName, storeName).should('exist');

      cy.step('Verify Ready status badge');
      featureStoreManagePage
        .findRowByName(projectName, storeName)
        .findByTestId('status-badge-ready')
        .should('have.text', 'Ready')
        .and('have.class', 'pf-m-green');

      cy.step('Verify namespace/project column');
      featureStoreManagePage
        .findRowByName(projectName, storeName)
        .should('contain.text', projectName);

      // ── Step 4: Expand row and verify details ──────────────────────────
      cy.step('Expand the row and verify detail summary');
      cy.findByTestId(`feature-store-row-${projectName}-${storeName}`)
        .findByRole('button', { name: 'Details' })
        .click();

      cy.contains('Feast project').should('be.visible');
      cy.contains(storeName).should('be.visible');
      cy.contains('Conditions').should('be.visible');

      // ── Step 5: Delete via the UI ──────────────────────────────────────
      cy.step('Delete the feature store via kebab menu');
      featureStoreManagePage.findKebabAction(projectName, storeName, 'Delete').click();
      deleteFeatureStoreModal.shouldBeOpen(storeName);

      deleteFeatureStoreModal.typeConfirmation(storeName);
      deleteFeatureStoreModal.findDeleteButton().should('not.be.disabled');
      deleteFeatureStoreModal.findDeleteButton().click();

      cy.step('Verify the delete dialog closes and the row is removed from the table');
      cy.findByRole('dialog', { timeout: 10000 }).should('not.exist');
      cy.findByTestId(`feature-store-row-${projectName}-${storeName}`, { timeout: 15000 }).should(
        'not.exist',
      );

      cy.step('Verify the FeatureStore CR is deleted from the cluster');
      pollUntilSuccess(
        `oc get featurestores.feast.dev ${storeName} -n ${projectName} 2>&1 | grep -q 'NotFound'`,
        `FeatureStore/${storeName} to be deleted`,
        { maxAttempts: 30, pollIntervalMs: 3000 },
      );
    },
  );
});
