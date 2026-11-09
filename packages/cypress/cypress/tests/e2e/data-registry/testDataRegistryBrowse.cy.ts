import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  cleanupDataRegistryTestResources,
  navigateToDataRegistry,
  setupDataRegistryTestProject,
} from '../../../utils/dataRegistryTestEnvironment';
import {
  deleteDataRegistryAsset,
  deleteDataRegistryBrowseAsset,
  deleteDataRegistryCollection,
  seedDataRegistryBrowseAsset,
  verifyDataRegistryAssetConnection,
  verifyDataRegistryAssetDoesNotExist,
  verifyDataRegistryAssetDescription,
  verifyDataRegistryAssetExists,
  verifyDataRegistryCollectionExists,
  verifyDataRegistryCollectionDoesNotExist,
  verifyDataRegistryProjectConnections,
} from '../../../utils/api/dataRegistry';

const crudUuid = generateTestUUID();
const crudCollectionName = `e2e-${crudUuid}`;
const crudAssetName = `e2e-asset-${crudUuid}`;
const testProjectName = `data-registry-e2e-${generateTestUUID()}`;
const testConnectionName = `data-registry-connection-${generateTestUUID()}`;

describe('Data Registry browse flow (RHOAI Secret fallback)', () => {
  let testData: Record<string, string> = {};
  let projectCleanupRequired = false;
  let browseAssetCreated = false;
  let crudCollectionCreated = false;
  let crudAssetCreated = false;

  retryableBefore(() => {
    return setupDataRegistryTestProject({
      projectName: testProjectName,
      connectionName: testConnectionName,
      onProjectCleanupRequired: () => {
        projectCleanupRequired = true;
      },
    }).then(({ testData: fixtureData }) => {
      testData = fixtureData;
    });
  });

  after(() => {
    return cleanupDataRegistryTestResources(testProjectName, projectCleanupRequired, [
      {
        label: `browse asset ${testData.asset}`,
        cleanup: browseAssetCreated
          ? () =>
              deleteDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset, {
                continueOnError: true,
              })
          : undefined,
      },
      {
        label: `CRUD asset ${crudAssetName}`,
        cleanup: crudAssetCreated
          ? () =>
              deleteDataRegistryAsset(testData.project, crudCollectionName, crudAssetName, {
                continueOnError: true,
              })
          : undefined,
      },
      {
        label: `CRUD collection ${crudCollectionName}`,
        cleanup: crudCollectionCreated
          ? () =>
              deleteDataRegistryCollection(testData.project, crudCollectionName, {
                continueOnError: true,
              })
          : undefined,
      },
    ]);
  });

  it(
    'should browse and create, update, and delete Data Registry collections and structured assets',
    {
      tags: ['@Dashboard', '@DataRegistry', '@NonConcurrent'],
    },
    () => {
      cy.step('Log in as the configured Data Registry test user');
      navigateToDataRegistry(testData.project, testData.collection, {
        verifyBrowserUser: true,
      });

      cy.step('Load RHOAI Secret-fallback connections before seeding the browse asset');
      dataRegistryPage.findRegisterDataAction().should('not.be.disabled').click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      verifyDataRegistryProjectConnections(testData.project, testConnectionName);
      dataRegistryPage.findConnectionsError().should('not.exist');
      dataRegistryPage.findConnectionToggle().should('not.be.disabled').click();
      dataRegistryPage.findConnectionOption(testConnectionName).click();
      dataRegistryPage.findConnectionToggle().should('contain.text', testConnectionName);

      cy.step(`Seed Data Registry asset/${testData.asset} as the test user`);
      seedDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset, () => {
        browseAssetCreated = true;
      }).then((created) => {
        browseAssetCreated ||= created;
      });

      cy.step(`Reload ${testData.project} and verify the seeded asset is listed`);
      navigateToDataRegistry(testData.project, testData.collection, {
        expectedAsset: testData.asset,
      });

      cy.step(`Open the ${testData.asset} data asset`);
      dataRegistryPage.findRegistryTable().should('be.visible');
      dataRegistryPage.openAsset(testData.asset);

      cy.step('Verify the data asset details page is loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.asset);
      dataRegistryPage.findAssetTypeBadge().should('contain.text', testData.expectedAssetType);

      cy.step(`Open the ${testData.collection} collection from the asset details`);
      dataRegistryPage.openCollectionFromAssetDetails(testData.collection);

      cy.step('Verify the collection details and assets are loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.collection);
      dataRegistryPage
        .findCollectionTypeBadge()
        .should('contain.text', testData.expectedCollectionType);
      dataRegistryPage.findCollectionDetailsCard().should('be.visible');
      dataRegistryPage.findCollectionAssetsTable().should('be.visible');

      cy.step(`Return to ${testData.project} to exercise Data Registry CRUD`);
      navigateToDataRegistry(testData.project, testData.collection, {
        expectedAsset: testData.asset,
      });

      cy.step(`Create the ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCreateCollectionButton().click();
      dataRegistryPage.findCreateCollectionRow().should('be.visible');
      dataRegistryPage.findCollectionNameInput().type(crudCollectionName);
      dataRegistryPage.findCollectionDescriptionInput().type(testData.crudCollectionDescription);
      dataRegistryPage
        .findCreateCollectionSubmit()
        .should('not.be.disabled')
        .click()
        .then(() => {
          crudCollectionCreated = true;
        });
      dataRegistryPage.findCreateCollectionRow().should('not.exist');
      dataRegistryPage.findManageCollectionsModal().should('be.visible');
      dataRegistryPage.findCollectionLink(crudCollectionName).should('be.visible');
      verifyDataRegistryCollectionExists(testData.project, crudCollectionName);
      dataRegistryPage.closeManageCollections();

      cy.step(`Register the ${crudAssetName} asset in ${crudCollectionName}`);
      dataRegistryPage.findRegisterDataButton().click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      cy.step('Select Structured to register a generic table');
      dataRegistryPage.findAssetTypeToggle().scrollIntoView().click();
      dataRegistryPage.findStructuredAssetTypeOption().click();
      dataRegistryPage.findConnectionsError().should('not.exist');
      dataRegistryPage.findConnectionToggle().should('not.be.disabled').click();
      dataRegistryPage.findConnectionOption(testConnectionName).click();
      dataRegistryPage.findConnectionToggle().should('contain.text', testConnectionName);
      dataRegistryPage.findDataNameInput().type(crudAssetName);
      dataRegistryPage.findDataDescriptionInput().type(testData.crudAssetDescription);
      dataRegistryPage.findDataCollectionToggle().click();
      dataRegistryPage.findDataCollectionOption(crudCollectionName).click();
      dataRegistryPage
        .findRegisterDataSubmit()
        .click()
        .then(() => {
          crudAssetCreated = true;
        });
      dataRegistryPage.findRegisterDataModal().should('not.exist');
      dataRegistryPage.findAssetLink(crudAssetName).should('be.visible');
      verifyDataRegistryAssetExists(testData.project, crudCollectionName, crudAssetName);
      verifyDataRegistryAssetConnection(
        testData.project,
        crudCollectionName,
        crudAssetName,
        testConnectionName,
      );

      cy.step(`Update the ${crudAssetName} asset description`);
      dataRegistryPage.openAsset(crudAssetName);
      dataRegistryPage.findAssetActionsToggle().click();
      dataRegistryPage.findEditAssetAction().click();
      dataRegistryPage.findEditAssetModal().should('be.visible');
      dataRegistryPage
        .findDataDescriptionInput()
        .clear()
        .type(testData.updatedCrudAssetDescription);
      dataRegistryPage.findEditAssetSave().click();
      dataRegistryPage.findEditAssetModal().should('not.exist');
      dataRegistryPage
        .findAssetDescription()
        .should('contain.text', testData.updatedCrudAssetDescription);
      cy.step('Verify the updated asset description in the Data Registry API');
      verifyDataRegistryAssetDescription(
        testData.project,
        crudCollectionName,
        crudAssetName,
        testData.updatedCrudAssetDescription,
      );

      cy.step(`Delete the ${crudAssetName} asset`);
      dataRegistryPage.findAssetActionsToggle().click();
      dataRegistryPage.findDeleteAssetAction().click();
      dataRegistryPage.findDeleteAssetConfirmation().type(crudAssetName);
      dataRegistryPage.findDeleteAssetConfirm().click();
      dataRegistryPage.findDeleteAssetModal().should('not.exist');
      dataRegistryPage.findRegistryTable().should('be.visible');
      dataRegistryPage.findAssetLink(crudAssetName).should('not.exist');
      verifyDataRegistryAssetDoesNotExist(testData.project, crudCollectionName, crudAssetName);

      cy.step(`Delete the empty ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCollectionDeleteButton(crudCollectionName).should('be.enabled');
      dataRegistryPage.findCollectionDeleteButton(crudCollectionName).click();
      dataRegistryPage.findDeleteCollectionConfirmButton().should('be.enabled').click();
      dataRegistryPage.findDeleteCollectionModal().should('not.exist');
      dataRegistryPage.findCollectionLink(crudCollectionName).should('not.exist');
      verifyDataRegistryCollectionDoesNotExist(testData.project, crudCollectionName);
    },
  );
});
