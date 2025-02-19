import { mockDashboardConfig, mockDscStatus } from '~/__mocks__';
import { mockModelCatalogConfigMap } from '~/__mocks__/mockModelCatalogConfigMap';
import { modelDetailsPage } from '~/__tests__/cypress/cypress/pages/modelDetailsPage';
import { ConfigMapModel } from '~/__tests__/cypress/cypress/utils/models';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: false,
    }),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-source-redhat',
    },
    mockModelCatalogConfigMap(),
  );
};

describe('Model details page', () => {
  beforeEach(() => {
    initIntercepts();
  });
  it('Model details page', () => {
    modelDetailsPage.visit();
    modelDetailsPage.findRegisterModelButton().should('be.enabled');
    modelDetailsPage
      .findLongDescription()
      .should(
        'have.text',
        'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from\nGranite-8B-Code-Base on a combination of permissively licensed instruction\ndata to enhance instruction following capabilities including logical\nreasoning and problem-solving skills.',
      );
    modelDetailsPage.findModelVersion().should('have.text', 'Version1.3.0');
    modelDetailsPage.findModelLicense().should('have.text', 'Licenseapache-2.0');
    modelDetailsPage.findModelProvider().should('have.text', 'ProviderIBM');
    modelDetailsPage
      .findModelSourceImageLocation()
      .should(
        'have.text',
        'oci://registry.redhat.io/rhelai1/granite-8b-code-instruct:1.3-1732870892',
      );
  });
});
