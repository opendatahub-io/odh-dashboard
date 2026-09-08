import { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared/types';
import { servingRuntimeTemplates } from '../../../../pages/modelDeploymentSettings/servingRuntimeTemplates';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { getSingleModelPath } from '../../../../utils/fileImportUtils';
import {
  cleanupTemplates,
  renderYamlFileWithReplacements,
} from '../../../../utils/oc_commands/templates';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

const uuid = generateTestUUID();
// Unique per-run names so the test is safe to run concurrently.
const modelServingSingleName = `single-cypress-vllm-runtime-${uuid}`;
const metadataSingleDisplayName = `Cypress Single ServingRuntime for KServe ${uuid}`;
// Rendered copy of the runtime YAML, written to a temp path outside the repo so the
// test still exercises the real "pick a file from disk" upload path (selectFile with a
// file path) without leaving stray files in the fixtures tree.
const renderedRuntimeYamlPath = `/tmp/kserve_singleservingruntime-${uuid}.yaml`;

retryableBefore(() => {
  // Render the templatized runtime YAML with unique names and write it to disk.
  renderYamlFileWithReplacements(getSingleModelPath(), {
    SERVING_RUNTIME_NAME: modelServingSingleName,
    SERVING_RUNTIME_DISPLAY_NAME: metadataSingleDisplayName,
  }).then((renderedYaml) => cy.writeFile(renderedRuntimeYamlPath, renderedYaml));

  // Clean up by nested ServingRuntime name (Template row id).
  cleanupTemplates(modelServingSingleName);
});
after(() => {
  cleanupTemplates(modelServingSingleName);
  cy.task('deleteFile', renderedRuntimeYamlPath);
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
      servingRuntimeTemplates.uploadYaml(renderedRuntimeYamlPath);

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
      const runtimeRow = servingRuntimeTemplates.getRowById(modelServingSingleName);
      runtimeRow.find().should('exist');
      runtimeRow.findKebabToggle().click();
      runtimeRow.findDeleteButton().click();

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
