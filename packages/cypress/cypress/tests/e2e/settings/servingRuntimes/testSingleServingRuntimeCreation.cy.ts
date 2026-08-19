import { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared/types';
import { servingRuntimeTemplates } from '../../../../pages/modelDeploymentSettings/servingRuntimeTemplates';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { getSingleModelPath } from '../../../../utils/fileImportUtils';
import { getSingleModelServingRuntimeInfo } from '../../../../utils/fileParserUtil';
import { cleanupTemplates } from '../../../../utils/oc_commands/templates';
import { retryableBefore } from '../../../../utils/retryableHooks';

let modelServingSingleName: string;
let metadataSingleDisplayName: string;

retryableBefore(() => {
  cy.wrap(null)
    .then(() => getSingleModelServingRuntimeInfo())
    .then((info) => {
      // Load Single-Model serving runtime info before tests run
      modelServingSingleName = info.singleModelServingName;
      metadataSingleDisplayName = info.displayName;
      cy.log(`Loaded Single-Model Name: ${modelServingSingleName}`);
      cy.log(`Loaded Single-Model Metadata Name: ${metadataSingleDisplayName}`);

      // Clean up by nested ServingRuntime name (Template row id)
      return cleanupTemplates(modelServingSingleName);
    });
});
after(() => {
  if (modelServingSingleName) {
    cleanupTemplates(modelServingSingleName);
  }
});

describe('Verify Admins Can Import and Delete a Custom Single-Model Serving Runtime Template By Uploading A YAML file', () => {
  it(
    'Admin should access serving runtimes, import a yaml file and then delete',
    {
      tags: [
        '@Smoke',
        '@SmokeSet2',
        '@ODS-2276',
        '@Dashboard',
        '@NonConcurrent',
        '@ModelServing',
        '@SettingsCI',
        '@KServeCI',
        '@ModelServingCI',
      ],
    },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to serving runtimes and import a multi-model serving yaml
      cy.step('Navigate to Serving Runtimes and add a new serving runtime').then(() => {
        // TODO: Remove extended timeout once '/servingruntimes' performance is optimized - RHOAIENG-15914
        // Current workaround for ODH page loading performance issues
        cy.log('⚠️ Note: RHOAIENG-15914 may cause intermittent failures at this step ⚠️');
        return cy.wrap(servingRuntimeTemplates.navigate(), { timeout: 100000 });
      });

      cy.log('Navigation successful | Searching for Add button');
      servingRuntimeTemplates.findAddButton().should('exist').and('be.visible').click();

      cy.step('Select API Protocol');
      servingRuntimeTemplates.findSelectAPIProtocolButton().click();
      servingRuntimeTemplates.selectAPIProtocol(ServingRuntimeAPIProtocol.REST);

      cy.step('Select Model Types');
      servingRuntimeTemplates.findSelectModelTypes().click();
      servingRuntimeTemplates.findPredictiveModelOption().click();

      cy.step('Upload a Single-Model Serving runtime yaml file');
      const singleModelYaml = getSingleModelPath();
      servingRuntimeTemplates.uploadYaml(singleModelYaml);

      cy.step('Click to save and verify that creation was successful');
      servingRuntimeTemplates
        .findSubmitButton()
        .should('be.enabled')
        .click()
        .then(() => {
          cy.url().should('match', /\/serving-runtime-templates$/, { timeout: 30000 });
        });

      // Edit the created model serving platform and delete
      cy.step(`Verify the model ${modelServingSingleName} has been created`);
      cy.contains(metadataSingleDisplayName).should('be.visible');
      servingRuntimeTemplates
        .getRowById(modelServingSingleName)
        .find()
        .within(() => {
          servingRuntimeTemplates.findEditModel().click();
        });
      servingRuntimeTemplates.findDeleteModel().click();

      servingRuntimeTemplates
        .findDeleteModal()
        .should('be.visible')
        .type(metadataSingleDisplayName);

      cy.step(`Delete the model ${modelServingSingleName}`);
      servingRuntimeTemplates.findDeleteModelServingButton().click();
      servingRuntimeTemplates.getRowById(modelServingSingleName).find().should('not.exist');
    },
  );
});
