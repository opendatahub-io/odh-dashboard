import {
  autoragConfigurePage,
  fileExplorer,
} from '~/__tests__/cypress/cypress/pages/evaluationFileCreator';

// my-project is the only fake namespace with a DSPA and secrets
// (packages/autorag/bff/internal/fake/k8s.go)
const NAMESPACE = 'my-project';
const MAAS_SECRET = 'maas';
const STORAGE_SECRET = 'data-connection';
const IMAGE_NAME = 'ocr-scan.tiff';

describe('AutoRAG knowledge document image upload', () => {
  beforeEach(() => {
    // Connection types come from the host dashboard API, not the autorag BFF.
    cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
  });

  it('should accept OCR image extensions and upload a TIFF image', () => {
    cy.intercept('POST', '**/autorag/api/v1/s3/files/**').as('uploadKnowledgeImage');

    autoragConfigurePage.visit(NAMESPACE);
    autoragConfigurePage.findNameInput().should('be.visible');
    cy.testA11y();
    autoragConfigurePage.findNameInput().type('Test Image Upload');

    autoragConfigurePage.findMaaSSecretSelector({ timeout: 60000 }).should('not.be.disabled');
    autoragConfigurePage.findMaaSSecretSelector().click();
    autoragConfigurePage.findMaaSSecretInput().type(MAAS_SECRET);
    autoragConfigurePage.findSecretOption(MAAS_SECRET).should('be.visible').click();
    autoragConfigurePage.findNextButton().should('be.enabled').click();
    autoragConfigurePage.findConfigureStepSubtitle().should('be.visible');

    autoragConfigurePage
      .findStorageSecretSelector({ timeout: 60000 })
      .should('exist')
      .and('not.be.disabled');
    autoragConfigurePage.findStorageSecretSelector().click();
    autoragConfigurePage.findStorageSecretInput().type(STORAGE_SECRET);
    autoragConfigurePage.findSecretOption(STORAGE_SECRET).should('be.visible').click();

    fileExplorer.findAddKnowledgeFilesButton().click();
    fileExplorer.find().should('be.visible');
    fileExplorer
      .findUploadInput()
      .invoke('attr', 'accept')
      .then((accept) => {
        expect(accept?.split(',')).to.include.members(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);
      });

    fileExplorer.findUploadInput().selectFile(
      {
        contents: 'mock TIFF image content',
        fileName: IMAGE_NAME,
        mimeType: 'image/tiff',
      },
      { force: true },
    );

    cy.wait('@uploadKnowledgeImage').then(({ response }) => {
      expect(response?.statusCode, 'upload status').to.be.oneOf([200, 201]);
      expect(response?.body?.key, 'uploaded key').to.include(IMAGE_NAME);
    });
    fileExplorer.findRow(IMAGE_NAME).should('contain.text', IMAGE_NAME);
  });
});
