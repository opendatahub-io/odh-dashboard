import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { manageSourcePage } from '../../../pages/manageSourcePage';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import {
  generateSourceIdFromName,
  requireHuggingFaceApiKey,
} from '../../../utils/catalogHuggingFace';
import {
  verifyModelCatalogBackend,
  deleteHuggingFaceCatalogSource,
  waitForModelCatalogCards,
} from '../../../utils/oc_commands/modelCatalog';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';

describe('Verify Hugging Face catalog source add, validate, and preview', () => {
  let testData: Record<string, string>;
  let hfApiKey: string;
  const testRunId = generateTestUUID();
  let sourceId: string;
  let sourceName: string;
  let privateSourceId: string;
  let privateSourceName: string;

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testCatalogHfSource.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
        sourceName = `${testData.sourceNamePrefix}-${testRunId}`;
        sourceId = generateSourceIdFromName(sourceName);
        privateSourceName = `${testData.privateSourceNamePrefix}-${testRunId}`;
        privateSourceId = generateSourceIdFromName(privateSourceName);
      })
      .then(() => {
        hfApiKey = requireHuggingFaceApiKey();
        verifyModelCatalogBackend();
        ensureAdminOcSession();
        deleteHuggingFaceCatalogSource(sourceId);
        deleteHuggingFaceCatalogSource(privateSourceId);
      });
  });

  after(() => {
    cy.step('Cleanup: delete test sources');
    ensureAdminOcSession();
    deleteHuggingFaceCatalogSource(sourceId);
    deleteHuggingFaceCatalogSource(privateSourceId);
  });

  it(
    'Add a Hugging Face source with public, gated, and private models via token validation and preview',
    {
      tags: ['@Sanity', '@SanitySet4', '@Dashboard', '@ModelCatalog', '@NonConcurrent'],
    },
    () => {
      const publicModelFull = `${testData.organization}/${testData.publicModel}`;
      const gatedManualFull = `${testData.organization}/${testData.gatedManualModel}`;
      const gatedAutoFull = `${testData.organization}/${testData.gatedAutoModel}`;

      const allowedModels = [
        testData.publicModel,
        testData.gatedManualModel,
        testData.gatedAutoModel,
      ].join(', ');

      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Navigate to Model catalog settings and open Add source');
      modelCatalogSettings.visit();
      modelCatalogSettings.findAddSourceButton().click();
      manageSourcePage.findAddSourceTitle().should('exist');
      manageSourcePage.findSourceTypeHuggingFace().should('be.checked');
      manageSourcePage.findCredentialsSection().should('exist');

      cy.step('Enter valid credentials and verify eye toggle');
      manageSourcePage.findOrganizationInput().clear().type(testData.organization);
      manageSourcePage.findAccessTokenInput().clear().type(hfApiKey, { log: false });
      manageSourcePage.findShowAccessTokenButton().click();
      manageSourcePage.findHideAccessTokenButton().click();

      cy.step('Validate credentials succeed with shared HF token');
      manageSourcePage.findValidateButton().click();
      manageSourcePage.findValidationSuccessAlert().should('exist');
      manageSourcePage.findShowAccessTokenButton().should('not.exist');
      manageSourcePage.findOrganizationInput().should('have.value', testData.organization);
      manageSourcePage.findPreviewPanelHeaderButton().should('not.be.disabled');
      manageSourcePage.findPreviewPanelBodyButton().should('not.be.disabled');

      cy.step('Run preview and verify public model appears');
      manageSourcePage.findPreviewPanelHeaderButton().click();
      manageSourcePage.findPreviewModelRow(publicModelFull).should('exist');

      cy.step('Apply model visibility filters and re-preview');
      manageSourcePage.findModelVisibilityToggleButton().click();
      manageSourcePage.findAllowedModelsInput().clear().type(allowedModels);
      manageSourcePage.findPreviewPanelHeaderButton().click();

      manageSourcePage.findPreviewIncludedTab().click();
      manageSourcePage.findPreviewModelRow(publicModelFull).should('exist');
      manageSourcePage.findPreviewModelRow(gatedManualFull).should('exist');
      manageSourcePage.findPreviewModelRow(gatedAutoFull).should('exist');
      manageSourcePage.findPreviewGatedAccessWarningIcon(gatedManualFull).should('not.exist');
      manageSourcePage.findPreviewGatedAccessWarningIcon(gatedAutoFull).should('not.exist');

      cy.step('Verify clear token modal cancel preserves validated state');
      manageSourcePage.findClearAccessTokenButton().click();
      manageSourcePage.findClearAccessTokenModal().should('exist');
      manageSourcePage.findClearAccessTokenModalCancelButton().click();
      manageSourcePage.findClearAccessTokenModal().should('not.exist');
      manageSourcePage.findValidationSuccessAlert().should('exist');

      cy.step('Fill source name, enable, and save');
      manageSourcePage.findNameInput().clear().type(sourceName);
      manageSourcePage.findEnableSourceCheckbox().click();
      manageSourcePage.findSubmitButton().should('not.be.disabled');
      manageSourcePage.findSubmitButton().click();

      cy.step('Verify source appears in settings table and becomes ready');
      modelCatalogSettings.findTable().should('exist');
      modelCatalogSettings.findSourceName(sourceId).should('contain', sourceName);
      modelCatalogSettings.findSourceStatusConnected(sourceId, 180000).should('exist');

      cy.step('Navigate to model catalog, select Other models, and verify public model');
      modelCatalog.visit();
      waitForModelCatalogCards();
      modelCatalog.findSourceCategoryBlock(testData.catalogCategoryBlockId).click();
      modelCatalog.findModelCatalogCard(testData.publicModel).should('exist');

      cy.step('Add a second source for RedHatAI private model access');
      modelCatalogSettings.visit();
      modelCatalogSettings.findAddSourceButton().click();
      manageSourcePage.findAddSourceTitle().should('exist');

      cy.step('Enter RedHatAI credentials, validate, and filter to private model');
      manageSourcePage.findOrganizationInput().clear().type(testData.privateOrganization);
      manageSourcePage.findAccessTokenInput().clear().type(hfApiKey, { log: false });
      manageSourcePage.findValidateButton().click();
      manageSourcePage.findValidationSuccessAlert().should('exist');
      manageSourcePage.findModelVisibilityToggleButton().click();
      manageSourcePage.findAllowedModelsInput().clear().type(testData.privateModel);

      cy.step('Fill private source name, enable, and save');
      manageSourcePage.findNameInput().clear().type(privateSourceName);
      manageSourcePage.findEnableSourceCheckbox().click();
      manageSourcePage.findSubmitButton().should('not.be.disabled');
      manageSourcePage.findSubmitButton().click();

      cy.step('Verify private source becomes ready');
      modelCatalogSettings.findTable().should('exist');
      modelCatalogSettings.findSourceName(privateSourceId).should('contain', privateSourceName);
      modelCatalogSettings.findSourceStatusConnected(privateSourceId, 180000).should('exist');

      cy.step('Navigate to model catalog and verify private model appears');
      modelCatalog.visit();
      waitForModelCatalogCards();
      modelCatalog.findSourceCategoryBlock(testData.catalogCategoryBlockId).click();
      modelCatalog.findModelCatalogCard(testData.privateModel).should('exist');
    },
  );
});
