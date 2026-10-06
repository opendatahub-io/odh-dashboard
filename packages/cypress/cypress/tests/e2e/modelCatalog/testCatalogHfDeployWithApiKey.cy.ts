import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  inferenceServiceActions,
  modelServingGlobal,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../pages/modelServing';
import {
  ModelDeploymentType,
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '../../../utils/modelServingConstants';
import { requireHuggingFaceApiKey } from '../../../utils/catalogHuggingFace';
import { verifyModelCatalogBackend } from '../../../utils/oc_commands/modelCatalog';
import { cleanupLLMInferenceService } from '../../../utils/oc_commands/modelServing';
import { verifyHfTokenServiceAccountWiring } from '../../../utils/oc_commands/hfTokenServiceAccount';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';

/**
 * E2E for private HF deploy via ServiceAccount + Secret (`{deployment}-hf-sa`).
 *
 * Does not rely on an enabled Hugging Face catalog source: creating/scanning HF
 * sources can stick on Starting/Scanning (observed on Zaffre). Instead, opens
 * the deploy wizard with `requiresHuggingFaceApiKey` location-state prefill
 * (same flag catalog private/gated deploy sets) and a private `hf://` URI.
 *
 * Still validates post-deploy SA + Secret ownerRefs for RHOAIENG-93850 /
 * RHOAIENG-96303. Catalog source create/validate UX remains in
 * testCatalogAddHfSources (RHOAIENG-89903).
 */
describe('Verify HF private deploy uses ServiceAccount and Secret', () => {
  let testData: Record<string, string>;
  let hfApiKey: string;
  const testRunId = generateTestUUID();
  let projectName: string;
  let deploymentDisplayName: string;
  let deploymentResourceName: string;
  let returnRoute: string;

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testCatalogHfDeploy.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
        projectName = `hf-sa-${testRunId}`.slice(0, 30).toLowerCase();
        deploymentDisplayName = `${testData.deploymentNamePrefix}-${testRunId}`.slice(0, 40);
        returnRoute = `/ai-hub/models/deployments/internal/${projectName}`;
      })
      .then(() => {
        hfApiKey = requireHuggingFaceApiKey();
        verifyModelCatalogBackend();
        ensureAdminOcSession();
        createCleanProject(projectName);
      });
  });

  after(() => {
    cy.step('Cleanup: delete deployment and project');
    ensureAdminOcSession();
    if (deploymentResourceName && projectName) {
      cleanupLLMInferenceService(deploymentResourceName, projectName);
    }
    if (projectName) {
      // Wait for namespace deletion so the HF_TOKEN Secret cannot linger for other users.
      deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
    }
  });

  it(
    'Deploy a private HF model with API key and verify ServiceAccount, Secret, and ownerRefs',
    {
      tags: [
        '@Dashboard',
        '@ModelCatalog',
        '@ModelServing',
        '@ModelServingCI',
        '@LLMDServingCI',
        '@Smoke',
        '@SmokeSet3',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Open deploy wizard with HF API key required (catalog private-model prefill flag)');
      modelServingWizard.visitRequiringHuggingFaceApiKey(returnRoute);

      cy.step('Preconfigure: select project');
      modelServingWizard.findPreconfigureStep().should('be.enabled');
      modelServingWizard.findModelDeploymentProjectSelector().should('exist').click();
      modelServingWizard
        .findModelDeploymentProjectSelectorOption(projectName)
        .should('exist')
        .click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Model source: private HF URI + API key');
      modelServingWizard.findModelSourceStep().should('be.enabled');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(testData.privateModelUri);
      // Avoid requiring a new connection name; HF token wiring is via SA+Secret, not the connection.
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked').click();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findHfApiKeyField().should('be.visible');
      modelServingWizard.findHfGatedAccessAlert().should('not.exist');
      modelServingWizard.findNextButton().should('be.disabled');
      modelServingWizard.findHfApiKeyInput().type(hfApiKey, { log: false });
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Model deployment: name + llm-d deployment type');
      modelServingWizard.findModelDeploymentNameInput().clear().type(deploymentDisplayName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard.getGeneratedResourceName().then((resourceName) => {
        deploymentResourceName = resourceName;
      });
      modelServingWizard.selectDeploymentType(ModelDeploymentType.TYPE1);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Advanced options: leave token auth off to avoid extra SAs');
      modelServingWizard.findTokenAuthenticationCheckbox().then(($checkbox) => {
        if ($checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Review and submit');
      modelServingWizard.findReviewStepModelDetailsSection().should('exist');
      modelServingWizard.findReviewHuggingFaceApiKey().should('exist');
      modelServingWizard
        .findReviewHuggingFaceApiKeyValue()
        .should('contain', testData.reviewHfApiKeyProvidedLabel);
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirect to deployments and HF ServiceAccount/Secret wiring');
      modelServingGlobal.assertPathname(returnRoute);
      const deploymentRow = modelServingGlobal.getDeploymentRow(deploymentDisplayName);
      deploymentRow.find().should('exist');
      cy.then(() => {
        verifyHfTokenServiceAccountWiring(
          deploymentResourceName,
          projectName,
          'LLMInferenceService',
        );
      });

      cy.step('Edit deployment: configured HF key placeholder, secret value not exposed');
      deploymentRow.findKebab().click();
      inferenceServiceActions.findEditInferenceServiceAction().click();
      modelServingWizardEdit.findModelSourceStep().should('be.enabled');
      modelServingWizardEdit.findHfApiKeyField().should('be.visible');
      modelServingWizardEdit.findHfApiKeyConfiguredHelper().should('be.visible');
      modelServingWizardEdit
        .findHfApiKeyInput()
        .should('have.attr', 'type', 'password')
        .and('have.value', testData.configuredHfApiKeyPlaceholder);
    },
  );
});
