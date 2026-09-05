import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isRHOAI } from '../../../utils/oc_commands/applications';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  waitForFeatureStoreDeleted,
  waitForFeatureStoreReady,
} from '../../../utils/oc_commands/featureStoreResources';
import { featureStoreCreatePage } from '../../../pages/featureStore/featureStoreCreate';
import {
  featureStoreManagePage,
  deleteFeatureStoreModal,
} from '../../../pages/featureStore/featureStoreManage';
import type { FeatureStoreAdminLifecycleTestData } from '../../../types';

describe('Feature Store Admin Lifecycle (Create → Verify Ready → Delete)', () => {
  const uuid = generateTestUUID();
  const projectName = `fs-admin-e2e-${uuid}`;
  let testData: FeatureStoreAdminLifecycleTestData;
  let skipTest = false;

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

      cy.fixture('e2e/featureStoreResources/testFeatureStoreAdminLifecycle.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as FeatureStoreAdminLifecycleTestData;
        })
        .then(() => {
          cy.step(`Create namespace: ${projectName}`);
          createCleanProject(projectName);
          return addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
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
  });

  it(
    'Creates a feature store via the wizard, verifies it becomes Ready on the manage page, and deletes it',
    {
      tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@FeatureFlagged'],
      retries: { runMode: 1, openMode: 0 },
    },
    () => {
      if (shouldSkip()) {
        return;
      }

      const storeName = `e2estore${generateTestUUID()}`;

      cy.step('Navigate to the create page');
      featureStoreCreatePage.visitWithAdminFlag(LDAP_ADMIN_USER);
      featureStoreCreatePage.findPageTitle().should('have.text', testData.createPageTitle);

      cy.step('Fill in Details step');
      featureStoreCreatePage.fillProjectName(storeName);
      featureStoreCreatePage.selectNamespace(projectName);
      featureStoreCreatePage.findNextButton().should('not.be.disabled');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Registry step');
      featureStoreCreatePage
        .findStepByName(testData.wizardSteps.registry)
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Online & offline stores step');
      featureStoreCreatePage
        .findStepByName(testData.wizardSteps.onlineOfflineStores)
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Advance through Advanced options step');
      featureStoreCreatePage
        .findStepByName(testData.wizardSteps.advancedOptions)
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      cy.step('Submit on Review step');
      featureStoreCreatePage
        .findStepByName(testData.wizardSteps.review)
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.findSubmitButton().should('not.be.disabled');
      featureStoreCreatePage.findSubmitButton().click();

      cy.step('Verify redirect to deployment progress page');
      cy.url({ timeout: 15000 }).should('include', '/create/deploy/');

      cy.step('Wait for FeatureStore CR to reach Ready phase');
      waitForFeatureStoreReady(projectName, storeName);

      cy.step('Navigate to the manage page');
      featureStoreManagePage.visitWithAdminFlag(LDAP_ADMIN_USER);
      featureStoreManagePage.findPageTitle().should('contain.text', testData.managePageTitle);

      cy.step('Verify the store appears in the table');
      featureStoreManagePage.findTable().should('be.visible');
      featureStoreManagePage.findRowByName(projectName, storeName).should('exist');

      cy.step('Verify Ready status badge');
      featureStoreManagePage
        .findStatusBadge(projectName, storeName)
        .should('have.text', testData.statusReady);

      cy.step('Verify namespace/project column');
      featureStoreManagePage
        .findRowByName(projectName, storeName)
        .should('contain.text', projectName);

      cy.step('Expand the row and verify detail summary');
      featureStoreManagePage.findExpandToggle(projectName, storeName).click();

      cy.contains(testData.expandedDetails.feastProject).should('be.visible');
      cy.contains(storeName).should('be.visible');
      cy.contains(testData.expandedDetails.conditions).should('be.visible');

      cy.step('Delete the feature store via kebab menu');
      featureStoreManagePage.findKebabAction(projectName, storeName, testData.deleteAction).click();
      deleteFeatureStoreModal.shouldBeOpen(storeName);

      deleteFeatureStoreModal.typeConfirmation(storeName);
      deleteFeatureStoreModal.findDeleteButton().should('not.be.disabled');
      deleteFeatureStoreModal.findDeleteButton().click();

      cy.step('Verify the delete dialog closes and the row is removed from the table');
      deleteFeatureStoreModal.shouldBeClosed();
      featureStoreManagePage.shouldNotHaveRow(projectName, storeName);

      cy.step('Verify the FeatureStore CR is deleted from the cluster');
      waitForFeatureStoreDeleted(projectName, storeName);
    },
  );
});
