import {
  modelServingGlobal,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { modelDetailsPage } from '#~/__tests__/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { provisionProjectForModelServing } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { modelCatalog } from '#~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalog';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Verify a model can be deployed from model catalog', () => {
  retryableBefore(() =>
    // Setup: Load test data and ensure clean state
    loadDSPFixture('e2e/modelCatalog/testModelCatalog.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project for pipelines
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    ),
  );
  after(() => {
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });
  it(
    'Verify a model can be deployed from model catalog',
    { tags: ['@Dashboard', '@ModelServing', 'Featureflagged'] },
    () => {
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      // Enable model catalog
      cy.window().then((win) => {
        win.sessionStorage.setItem('odh-feature-flags', '{"disableModelCatalog":false}');
      });
      cy.reload();

      cy.step('Navigate to Model Catalog');
      modelCatalog.visit();

      // Find the first model card and click on the detail link
      modelCatalog.findFirstModelCatalogCard().should('exist');
      modelCatalog.findFirstModelCatalogCardLink().should('exist').click();
      modelDetailsPage.findModelSourceImageLocation().should('exist');
      modelDetailsPage
        .findModelSourceImageLocation()
        .invoke('text')
        .then((text) => {
          cy.wrap(text.trim()).as('modelSourceImageLocation');
        });

      modelCatalog.clickDeployModelButtonWithRetry();

      cy.step('Verify model location gets prefilled');
      modelServingWizard.findModelSourceStep().click();
      modelServingWizard.findModelLocationSelect().should('contain.text', 'URI');
      cy.get('@modelSourceImageLocation').then((modelSourceImageLocation) => {
        modelServingWizard.findUrilocationInput().should('have.value', modelSourceImageLocation);
      });
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Model deployment step');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findModelDeploymentProjectSelector().should('exist');
      modelServingWizard.findModelDeploymentProjectSelector().click();
      modelServingWizard
        .findModelDeploymentProjectSelectorOption(projectName)
        .should('exist')
        .click();

      modelServingWizard.findFirstServingRuntimeTemplateOption().should('exist').click();

      cy.step('Advanced options step');
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.enabled');
      modelServingWizard.findTokenAuthenticationCheckbox().click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Summary step');
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirection to the global page');
      cy.location('pathname').should('eq', `/ai-hub/deployments/${projectName}`);
      modelServingGlobal.getInferenceServiceRow(modelName);
    },
  );
});
