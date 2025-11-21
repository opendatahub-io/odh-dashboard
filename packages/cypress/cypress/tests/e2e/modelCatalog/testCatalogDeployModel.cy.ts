import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import type { DataScienceProjectData } from '../../../types';
import { retryableBefore } from '../../../utils/retryableHooks';
import { loadDSPFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { provisionProjectForModelServing } from '../../../utils/oc_commands/modelServing';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

// TODO: Update this to check for model readiness once vLLM CPU works: https://issues.redhat.com/browse/RHAIRFE-28
// and make it RHOAI-specific, unless the vLLM CPU image works on ODH at that time
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
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });
  it(
    'Verify a model can be deployed from model catalog',
    { tags: ['@Dashboard', '@ModelServing', '@Smoke', '@SmokeSet3'] },
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
      modelDetailsPage.getModelSourceImageLocation().then((modelSourceImageLocation) => {
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

      modelServingWizard.findServingRuntimeSelectRadio().click();
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
