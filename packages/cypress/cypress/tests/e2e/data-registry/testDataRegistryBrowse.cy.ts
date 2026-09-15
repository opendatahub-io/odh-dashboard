import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';

describe('Data Registry browse flow', () => {
  let testData: Record<string, string>;

  before(() => {
    cy.fixture('e2e/dataRegistry/testDataRegistry.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as Record<string, string>;
    });
  });

  it(
    'should browse a collection and its asset through the live Data Registry backend',
    { tags: ['@Dashboard', '@DataRegistry', '@Smoke'] },
    () => {
      cy.step('Log in as an administrator');
      dataRegistryPage.navigate(undefined, HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Select the ${testData.project} project`);
      dataRegistryPage.selectProject(testData.project);

      cy.step(`Open the ${testData.asset} data asset`);
      dataRegistryPage.findRegistryTable().should('be.visible');
      dataRegistryPage.openAsset(testData.asset);

      cy.step('Verify the data asset details page is loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.asset);
      dataRegistryPage.findAssetTypeBadge().should('contain.text', 'Data asset');

      cy.step(`Open the ${testData.collection} collection from the breadcrumb`);
      dataRegistryPage.openCollectionFromBreadcrumb(testData.collection);

      cy.step('Verify the collection details and assets are loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.collection);
      dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
      dataRegistryPage.findCollectionDetailsCard().should('be.visible');
      dataRegistryPage.findCollectionAssetsTable().should('be.visible');
    },
  );
});
