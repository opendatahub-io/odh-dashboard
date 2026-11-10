import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  cleanupDataRegistryTestResources,
  navigateToDataRegistry,
  setupDataRegistryTestProject,
} from '../../../utils/dataRegistryTestEnvironment';
import {
  deleteDataRegistryBrowseAsset,
  deleteDataRegistryCollection,
  seedDataRegistryBrowseAsset,
  verifyDataRegistryCollectionExists,
} from '../../../utils/api/dataRegistry';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const testProjectName = `data-registry-collection-e2e-${generateTestUUID()}`;
const secondCollectionName = `e2e-secondary-${generateTestUUID()}`;
describe('Data Registry - Collection Details', () => {
  let testData: Record<string, string> = {};
  let projectCleanupRequired = false;
  let secondCollectionCreated = false;
  let browseAssetCreated = false;

  before(() =>
    setupDataRegistryTestProject({
      projectName: testProjectName,
      onProjectCleanupRequired: () => {
        projectCleanupRequired = true;
      },
    })
      .then(({ testData: fixtureData }) => {
        testData = fixtureData;
      })
      .then(() => {
        cy.step(`Seed Data Registry asset/${testData.asset}`);
        return seedDataRegistryBrowseAsset(
          testData.project,
          testData.collection,
          testData.asset,
          () => {
            browseAssetCreated = true;
          },
        ).then((created) => {
          browseAssetCreated ||= created;
        });
      })
      .then(() => {
        cy.step(`Reload ${testData.project} and wait for ${testData.asset} to appear`);
        dataRegistryPage.navigate(testData.project, LDAP_ADMIN_USER);
        dataRegistryPage.selectProject(testData.project);
        return dataRegistryPage.findAssetLink(testData.asset).should('be.visible');
      })
      .then(() => {
        cy.step(`Create Data Registry collection/${secondCollectionName}`);
        dataRegistryPage.openManageCollections();
        dataRegistryPage.findCreateCollectionButton().click();
        dataRegistryPage.findCreateCollectionRow().should('be.visible');
        dataRegistryPage.findCollectionNameInput().type(secondCollectionName);
        dataRegistryPage
          .findCollectionDescriptionInput()
          .type(testData.secondaryCollectionDescription);
        return dataRegistryPage
          .findCreateCollectionSubmit()
          .should('not.be.disabled')
          .click()
          .then(() => {
            secondCollectionCreated = true;
          })
          .then(() => dataRegistryPage.findCreateCollectionRow().should('not.exist'))
          .then(() => dataRegistryPage.findManageCollectionsModal().should('be.visible'))
          .then(() =>
            dataRegistryPage.findCollectionLink(secondCollectionName).should('be.visible'),
          )
          .then(() => verifyDataRegistryCollectionExists(testData.project, secondCollectionName));
      }),
  );

  after(() => {
    return cleanupDataRegistryTestResources(testProjectName, projectCleanupRequired, [
      {
        label: `collection ${secondCollectionName}`,
        cleanup: secondCollectionCreated
          ? () =>
              deleteDataRegistryCollection(testData.project, secondCollectionName, {
                continueOnError: true,
              })
          : undefined,
      },
      {
        label: `browse asset ${testData.asset}`,
        cleanup: browseAssetCreated
          ? () =>
              deleteDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset, {
                continueOnError: true,
              })
          : undefined,
      },
    ]);
  });

  it(
    'should display collection detail page',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(
        testData.project,
        secondCollectionName,
        LDAP_ADMIN_USER,
      );

      // Verify collection detail page loaded
      dataRegistryPage.findPageTitle().should('contain.text', secondCollectionName);
      dataRegistryPage
        .findCollectionTypeBadge()
        .should('contain.text', testData.expectedCollectionType);
      dataRegistryPage
        .findCollectionDescription(testData.secondaryCollectionDescription)
        .should('be.visible');
    },
  );

  it(
    'should display collection details card with correct information',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      // Navigate directly to collection detail
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Verify collection details card
      dataRegistryPage.findCollectionDetailsCard().should('exist');
      dataRegistryPage.findCollectionDetailDescriptionList().should('exist');

      // Verify structured/unstructured counts
      dataRegistryPage.findCollectionStructuredCount().should('exist');
      dataRegistryPage.findCollectionUnstructuredCount().should('exist');

      // Verify owner
      dataRegistryPage.findCollectionOwner().should('exist');

      // Verify created timestamp
      dataRegistryPage.findCollectionCreatedAt().should('exist');
    },
  );

  it(
    'should display data assets table',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Verify data assets card
      dataRegistryPage.findDataAssetsCard().should('exist');
      dataRegistryPage.findCollectionAssetsTable().should('exist');

      // Verify table has headers
      dataRegistryPage
        .findCollectionAssetsTableHeaders()
        .should('contain', testData.assetTableNameColumn)
        .and('contain', testData.assetTableTypeColumn)
        .and('contain', testData.assetTableFormatColumn);
    },
  );

  it(
    'should navigate to asset detail from collection assets table',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Click on an asset name
      dataRegistryPage.findCollectionAssetLink(testData.asset).click();

      // Verify navigated to asset detail page
      dataRegistryPage.shouldHaveAssetDetailUrl(
        testData.project,
        testData.collection,
        testData.asset,
      );
      dataRegistryPage.findAssetTypeBadge().should('contain.text', testData.expectedAssetType);
    },
  );

  it(
    'should show delete collection disabled when collection has assets',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Open actions menu
      dataRegistryPage.findCollectionActionsToggle().click();

      // Verify delete is disabled
      dataRegistryPage.findCollectionDeleteAction().should('have.attr', 'aria-disabled', 'true');
    },
  );

  it(
    'should open register data modal',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Open actions menu
      dataRegistryPage.findCollectionActionsToggle().click();

      // Click register data
      dataRegistryPage.findCollectionRegisterDataAction().click();

      // Verify modal opened
      dataRegistryPage.findRegisterDataModal().should('be.visible');
    },
  );

  it(
    'should open manage collections modal with all collections',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Open actions menu
      dataRegistryPage.findCollectionActionsToggle().click();

      // Click manage collections
      dataRegistryPage.findCollectionManageCollectionsAction().click();

      // Verify modal opened
      dataRegistryPage.findManageCollectionsModal().should('be.visible');

      // Verify all collections are listed, not just current one
      dataRegistryPage.findCollectionRows().should('have.length.greaterThan', 1);
      dataRegistryPage.findCollectionLink(testData.collection).should('be.visible');
      dataRegistryPage.findCollectionLink(secondCollectionName).should('be.visible');
    },
  );

  it(
    'should navigate to collection detail from manage collections modal',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      navigateToDataRegistry(testData.project, testData.collection);

      // Open manage collections
      dataRegistryPage.openManageCollections();

      // Click on a collection name
      dataRegistryPage.findCollectionLink(testData.collection).click();

      // Verify navigated to collection detail
      dataRegistryPage.shouldHaveCollectionDetailUrl(testData.project, testData.collection);
      dataRegistryPage
        .findCollectionTypeBadge()
        .should('contain.text', testData.expectedCollectionType);
    },
  );

  it(
    'should show trash icon for delete in manage collections',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      navigateToDataRegistry(testData.project, testData.collection);

      // Open manage collections
      dataRegistryPage.openManageCollections();

      // Verify trash icon buttons exist
      dataRegistryPage.findCollectionDeleteButtons().should('exist');
    },
  );
});
