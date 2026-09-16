import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  createFeatureStoreCR,
  deleteFeatureStoreCR,
  waitForDataRegistryNamespace,
} from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  deleteDataRegistryBrowseAsset,
  seedDataRegistryBrowseAsset,
} from '../../../utils/api/dataRegistry';

const crudUuid = generateTestUUID();
const crudCollectionName = `e2e-${crudUuid}`;
const crudAssetName = `e2e-asset-${crudUuid}`;
const crudAssetDescription = 'Data Registry CRUD asset';
const updatedCrudAssetDescription = 'Updated Data Registry CRUD asset';
const testProjectName = `data-registry-e2e-${generateTestUUID()}`;

describe('Data Registry browse flow', () => {
  let testData: Record<string, string>;
  let dataRegistryNamespace: string;
  let projectCreated = false;
  let featureStoreSetupAttempted = false;
  let browseAssetCreated = false;

  retryableBefore(() => {
    return ensureAdminOcSession()
      .then(() => cy.fixture('e2e/dataRegistry/testDataRegistry.yaml', 'utf8'))
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;
        testData.project = testProjectName;
      })
      .then(() => {
        cy.step(`Create Data Registry project/${testProjectName}`);
        return createCleanProject(testProjectName).then(() => {
          projectCreated = true;
        });
      })
      .then(() => {
        return waitForDataRegistryNamespace().then((namespace) => {
          dataRegistryNamespace = namespace;
        });
      })
      .then(() => {
        cy.step('Create FeatureStore/data-registry for Data Registry');
        featureStoreSetupAttempted = true;
        return createFeatureStoreCR(dataRegistryNamespace, 'data-registry', {
          dataRegistryEnabled: true,
        });
      })
      .then(() => {
        cy.step(`Seed Data Registry asset/${testData.asset}`);
        return seedDataRegistryBrowseAsset(
          testData.project,
          testData.collection,
          testData.asset,
        ).then((created) => {
          browseAssetCreated = created;
        });
      });
  });

  after(() => {
    if (!projectCreated && !featureStoreSetupAttempted) {
      cy.log('Skipping Data Registry cleanup');
      return;
    }

    return ensureAdminOcSession()
      .then(() => {
        if (!browseAssetCreated) {
          return;
        }
        cy.step(`Delete Data Registry asset/${testData.asset}`);
        return deleteDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset);
      })
      .then(() => {
        if (!featureStoreSetupAttempted) {
          return;
        }
        cy.step('Delete FeatureStore/data-registry');
        return deleteFeatureStoreCR(dataRegistryNamespace, 'data-registry');
      })
      .then(() => {
        if (!projectCreated) {
          return;
        }
        cy.step(`Delete Data Registry project/${testProjectName}`);
        return deleteOpenShiftProject(testProjectName, {
          wait: false,
          ignoreNotFound: true,
        });
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

  it(
    'should create, update, and delete a data registry collection and asset',
    { tags: ['@Dashboard', '@DataRegistry', '@Smoke'] },
    () => {
      cy.step('Log in as an administrator');
      dataRegistryPage.navigate(undefined, HTPASSWD_CLUSTER_ADMIN_USER);
      dataRegistryPage.selectProject(testData.project);

      cy.step(`Create the ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCreateCollectionButton().click();
      dataRegistryPage.findCreateCollectionModal().should('be.visible');
      dataRegistryPage.findCollectionNameInput().type(crudCollectionName);
      dataRegistryPage.findCollectionDescriptionInput().type('Data Registry CRUD collection');
      dataRegistryPage.findCreateCollectionSubmit().should('not.be.disabled').click();
      dataRegistryPage.findCreateCollectionModal().should('not.be.visible');
      dataRegistryPage.findCollectionLink(crudCollectionName).should('be.visible');
      dataRegistryPage.closeManageCollections();

      cy.step(`Register the ${crudAssetName} asset in ${crudCollectionName}`);
      dataRegistryPage.findRegisterDataButton().click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      dataRegistryPage.findDataNameInput().type(crudAssetName);
      dataRegistryPage.findDataDescriptionInput().type(crudAssetDescription);
      dataRegistryPage.selectDataCollection(crudCollectionName);
      dataRegistryPage.findRegisterDataSubmit().click();
      dataRegistryPage.findRegisterDataModal().should('not.be.visible');
      dataRegistryPage.findAssetLink(crudAssetName).should('be.visible');

      cy.step(`Update the ${crudAssetName} asset description`);
      dataRegistryPage.openAsset(crudAssetName);
      dataRegistryPage.findAssetActionsToggle().click();
      dataRegistryPage.findEditAssetAction().click();
      dataRegistryPage.findEditAssetModal().should('be.visible');
      dataRegistryPage.findDataDescriptionInput().clear().type(updatedCrudAssetDescription);
      dataRegistryPage.findEditAssetSave().click();
      dataRegistryPage.findEditAssetModal().should('not.be.visible');
      dataRegistryPage.findAssetDescription().should('contain.text', updatedCrudAssetDescription);

      cy.step(`Delete the ${crudAssetName} asset`);
      dataRegistryPage.findAssetActionsToggle().click();
      dataRegistryPage.findDeleteAssetAction().click();
      dataRegistryPage.findDeleteAssetConfirmation().type(crudAssetName);
      dataRegistryPage.findDeleteAssetConfirm().click();
      dataRegistryPage.findDeleteAssetModal().should('not.be.visible');
      dataRegistryPage.findRegistryTable().should('be.visible');
      dataRegistryPage.findAssetLink(crudAssetName).should('not.exist');

      cy.step(`Delete the empty ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCollectionDeleteButton(crudCollectionName).click();
      dataRegistryPage.findDeleteCollectionConfirmation().type(crudCollectionName);
      dataRegistryPage.findDeleteCollectionConfirmButton().click();
      dataRegistryPage.findDeleteCollectionModal().should('not.be.visible');
      dataRegistryPage.findCollectionLink(crudCollectionName).should('not.exist');
    },
  );
});
