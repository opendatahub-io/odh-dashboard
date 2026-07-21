import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import type { FeatureStoreTestData } from '../../../types';
import { createFeatureStoreCR } from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { isRHOAI } from '../../../utils/oc_commands/applications';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';

describe('Verify RBAC scoped Feature Store discovery by namespace access', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  let skipTest = false;
  const uuid = generateTestUUID();

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - Feature Store is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

  retryableBefore(() => {
    cy.step('Ensure admin oc session for setup');
    ensureAdminOcSession();

    cy.step('Check if the operator is RHOAI');
    isRHOAI().then((rhoai) => {
      if (!rhoai) {
        cy.log('ODH detected, skipping RHOAI-specific test.');
        skipTest = true;
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as FeatureStoreTestData;
          projectName = `${testData.projectName}-${uuid}`;
        })
        .then(() => {
          cy.step(`Create namespace: ${projectName}`);
          createCleanProject(projectName);
        })
        .then(() => {
          cy.step(`Apply FeatureStore CR in namespace: ${projectName}`);
          createFeatureStoreCR(projectName, testData.feastInstanceName);
        });
    });
  });

  after(() => {
    if (!wasSetupPerformed() || shouldSkip()) {
      cy.log('Skipping cleanup: Setup was not performed or tests were skipped');
      return;
    }
    cy.step('Restore admin oc session for cleanup');
    ensureAdminOcSession();

    cy.step(`Delete namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Admin user can discover the Feature Store project',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@Smoke', '@SmokeSet1'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Log in as admin user');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Navigate to the Feature Store Overview page');
      featureStoreGlobal.navigateToOverview();

      cy.step('Verify the Feature Store project is discoverable and select it');
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);

      cy.step('Verify the project selector shows the selected project');
      featureStoreGlobal
        .findProjectSelector()
        .should('contain.text', testData.feastCreditScoringProject);
    },
  );

  it(
    'Non-admin user without namespace access cannot discover the Feature Store project',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@Smoke', '@SmokeSet1'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Log in as non-admin user (no access to the test namespace)');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to the Feature Store Overview page');
      featureStoreGlobal.navigateToOverview();

      cy.step('Verify the Feature Store empty state is shown (no projects accessible)');
      featureStoreGlobal.shouldShowNoFeatureStoreService();

      cy.step('Verify the project selector is not present');
      featureStoreGlobal.findProjectSelector().should('not.exist');
    },
  );
});
