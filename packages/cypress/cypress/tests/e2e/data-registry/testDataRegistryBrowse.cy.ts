import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  addUserToProject,
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  createFeatureStoreCR,
  deleteFeatureStoreCR,
  waitForDataRegistryFeatureStoreReady,
  waitForDataRegistryNamespace,
} from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  deleteDataRegistryAsset,
  deleteDataRegistryBrowseAsset,
  deleteDataRegistryCollection,
  seedDataRegistryBrowseAsset,
  verifyDataRegistryAssetExists,
  verifyDataRegistryCollectionExists,
} from '../../../utils/api/dataRegistry';

const crudUuid = generateTestUUID();
const crudCollectionName = `e2e-${crudUuid}`;
const crudAssetName = `e2e-asset-${crudUuid}`;
const crudAssetDescription = 'Data Registry CRUD asset';
const updatedCrudAssetDescription = 'Updated Data Registry CRUD asset';
const testProjectName = `data-registry-e2e-${generateTestUUID()}`;

const navigateToDataRegistry = (project: string): void => {
  // The CLI session used during setup is independent from the browser session. Clear any
  // existing browser session so visitWithLogin authenticates as the configured test user.
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.intercept('GET', '**/data-registry/api/v1/namespaces').as('dataRegistryNamespaces');
  dataRegistryPage.navigate(project, LDAP_ADMIN_USER);
  cy.wait('@dataRegistryNamespaces').then(({ response }) => {
    const namespaces = (response?.body as { data?: Array<{ name?: string }> } | undefined)?.data
      ?.map((namespace) => namespace.name)
      .filter((name): name is string => Boolean(name));

    cy.log(
      `Data Registry namespaces response (${response?.statusCode ?? 'unknown'}): ${
        namespaces?.join(', ') || '(none)'
      }`,
    );
    expect(response?.statusCode, 'Data Registry namespace request status').to.equal(200);
    expect(namespaces, 'Data Registry namespace response').to.include(project);
  });
};

describe('Data Registry browse flow', () => {
  let testData: Record<string, string>;
  let dataRegistryNamespace: string;
  let projectCreated = false;
  let featureStoreCreated = false;
  let browseAssetCreated = false;
  let crudCollectionCreated = false;
  let crudAssetCreated = false;

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
        cy.step(`Grant ${LDAP_ADMIN_USER.USERNAME} access to ${testProjectName}`);
        return addUserToProject(testProjectName, LDAP_ADMIN_USER.USERNAME, 'admin').then(() =>
          waitForUserProjectAccess(testProjectName, LDAP_ADMIN_USER.USERNAME),
        );
      })
      .then(() => {
        return waitForDataRegistryNamespace().then((namespace) => {
          dataRegistryNamespace = namespace;
        });
      })
      .then(() => {
        cy.step('Create FeatureStore/data-registry for Data Registry');
        return createFeatureStoreCR(dataRegistryNamespace, 'data-registry', {
          dataRegistryEnabled: true,
        }).then((created) => {
          featureStoreCreated = created === true;
          if (!featureStoreCreated) {
            cy.log(
              `Preserving existing FeatureStore/data-registry in ${dataRegistryNamespace}; ` +
                'this test does not own it',
            );
          }
          return waitForDataRegistryFeatureStoreReady(dataRegistryNamespace, 'data-registry');
        });
      })
      .then(() => {
        cy.step(`Seed Data Registry asset/${testData.asset}`);
        return seedDataRegistryBrowseAsset(
          testData.project,
          testData.collection,
          testData.asset,
        ).then((created) => {
          browseAssetCreated ||= created;
        });
      });
  });

  after(() => {
    if (
      !projectCreated &&
      !featureStoreCreated &&
      !browseAssetCreated &&
      !crudCollectionCreated &&
      !crudAssetCreated
    ) {
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
        if (!crudAssetCreated) {
          return;
        }
        cy.step(`Delete Data Registry asset/${crudAssetName}`);
        return deleteDataRegistryAsset(testData.project, crudCollectionName, crudAssetName);
      })
      .then(() => {
        if (!crudCollectionCreated) {
          return;
        }
        cy.step(`Delete Data Registry collection/${crudCollectionName}`);
        return deleteDataRegistryCollection(testData.project, crudCollectionName);
      })
      .then(() => {
        if (!featureStoreCreated) {
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
    'should browse and create, update, and delete Data Registry collections and assets',
    { tags: ['@Dashboard', '@DataRegistry', '@Smoke', '@SmokeSet1'] },
    () => {
      cy.step('Log in as an administrator');
      navigateToDataRegistry(testData.project);
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

      cy.step(`Return to ${testData.project} to exercise Data Registry CRUD`);
      navigateToDataRegistry(testData.project);
      dataRegistryPage.selectProject(testData.project);

      cy.step(`Create the ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCreateCollectionButton().click();
      dataRegistryPage.findCreateCollectionModal().should('be.visible');
      dataRegistryPage.findCollectionNameInput().type(crudCollectionName);
      dataRegistryPage.findCollectionDescriptionInput().type('Data Registry CRUD collection');
      dataRegistryPage.findCreateCollectionSubmit().should('not.be.disabled').click();
      dataRegistryPage
        .findCreateCollectionModal()
        .should('not.be.visible')
        .then(() => {
          crudCollectionCreated = true;
        });
      dataRegistryPage.findCollectionLink(crudCollectionName).should('be.visible');
      verifyDataRegistryCollectionExists(testData.project, crudCollectionName);
      dataRegistryPage.closeManageCollections();

      cy.step(`Register the ${crudAssetName} asset in ${crudCollectionName}`);
      dataRegistryPage.findRegisterDataButton().click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      dataRegistryPage.findDataNameInput().type(crudAssetName);
      dataRegistryPage.findDataDescriptionInput().type(crudAssetDescription);
      dataRegistryPage.selectDataCollection(crudCollectionName);
      dataRegistryPage.findRegisterDataSubmit().click();
      dataRegistryPage
        .findRegisterDataModal()
        .should('not.be.visible')
        .then(() => {
          crudAssetCreated = true;
        });
      dataRegistryPage.findAssetLink(crudAssetName).should('be.visible');
      verifyDataRegistryAssetExists(testData.project, crudCollectionName, crudAssetName);

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
