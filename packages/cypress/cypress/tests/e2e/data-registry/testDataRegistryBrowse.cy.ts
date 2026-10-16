import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import type { DataConnectionUriReplacements } from '../../../types';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { createDataConnectionUri } from '../../../utils/oc_commands/dataConnection';
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
  verifyDataRegistryAssetDoesNotExist,
  verifyDataRegistryAssetExists,
  verifyDataRegistryCollectionExists,
} from '../../../utils/api/dataRegistry';

const crudUuid = generateTestUUID();
const crudCollectionName = `e2e-${crudUuid}`;
const crudAssetName = `e2e-asset-${crudUuid}`;
const crudAssetDescription = 'Data Registry CRUD asset';
const updatedCrudAssetDescription = 'Updated Data Registry CRUD asset';
const testProjectName = `data-registry-e2e-${generateTestUUID()}`;
const testConnectionName = `data-registry-connection-${generateTestUUID()}`;
let dataRegistryNavigationSequence = 0;

const navigateToDataRegistry = (
  project: string,
  collection: string,
  options: {
    clearSession?: boolean;
    expectedAsset?: string;
    verifyBrowserUser?: boolean;
  } = {},
): void => {
  const { clearSession = false, expectedAsset, verifyBrowserUser = false } = options;
  const navigationId = dataRegistryNavigationSequence++;
  const namespacesAlias = `dataRegistryNamespaces${navigationId}`;
  const currentUserAlias = `dataRegistryCurrentUser${navigationId}`;
  const projectCollectionsAlias = `dataRegistryProjectCollections${navigationId}`;
  const tableAssetsAlias = `dataRegistryTableAssets${navigationId}`;
  if (clearSession) {
    // Ensure the configured test user is used even if a previous test logged in as an admin.
    cy.clearCookies();
    cy.clearLocalStorage();
  }
  cy.intercept('GET', '**/data-registry/api/v1/namespaces').as(namespacesAlias);
  if (verifyBrowserUser) {
    cy.intercept('GET', '**/data-registry/api/v1/user').as(currentUserAlias);
  }
  cy.intercept('GET', `**/data-registry/api/v1/${project}/namespaces`).as(projectCollectionsAlias);
  cy.intercept(
    'GET',
    `**/data-registry/api/v1/${project}/namespaces/${collection}/generic-tables`,
  ).as(tableAssetsAlias);
  dataRegistryPage.navigate(project, LDAP_ADMIN_USER);
  if (verifyBrowserUser) {
    cy.wait(`@${currentUserAlias}`).then(({ response }) => {
      const actualUser = (response?.body as { data?: { userId?: string } } | undefined)?.data
        ?.userId;
      expect(actualUser, 'Data Registry browser identity').to.equal(LDAP_ADMIN_USER.USERNAME);
    });
  }
  cy.wait(`@${namespacesAlias}`).then(({ response }) => {
    const namespaces = (response?.body as { data?: Array<{ name?: string }> } | undefined)?.data
      ?.map((namespace) => namespace.name)
      .filter((name): name is string => Boolean(name));

    expect(response?.statusCode, 'Data Registry namespace request status').to.equal(200);
    expect(namespaces, 'Data Registry namespace response').to.include(project);
  });
  cy.wait(`@${projectCollectionsAlias}`).then(({ response }) => {
    const collections = (
      response?.body as { namespaces?: Array<[string]> } | undefined
    )?.namespaces?.map(([name]) => name);
    expect(response?.statusCode, 'Data Registry project collections request status').to.equal(200);
    expect(collections, 'Data Registry project collections').to.include(collection);
    return cy.wait(`@${tableAssetsAlias}`).then(({ response: assetsResponse }) => {
      const assets = (
        assetsResponse?.body as { assets?: Array<{ name: string }> } | undefined
      )?.assets?.map(({ name }) => name);
      expect(assetsResponse?.statusCode, 'Data Registry asset list request status').to.equal(200);
      if (expectedAsset) {
        expect(assets, 'Data Registry asset list').to.include(expectedAsset);
      }
    });
  });
};

describe('Data Registry browse flow (RHOAI Secret fallback)', () => {
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
        cy.step(`Create RHOAI connection/${testConnectionName} in ${testProjectName}`);
        const connectionReplacements: DataConnectionUriReplacements = {
          NAMESPACE: testProjectName,
          MODEL_URI: Buffer.from(`https://example.com/${testConnectionName}`).toString('base64'),
          CONNECTION_NAME: testConnectionName,
        };
        return createDataConnectionUri(connectionReplacements);
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
          featureStoreCreated ||= created === true;
          if (!featureStoreCreated) {
            cy.log(
              `Preserving existing FeatureStore/data-registry in ${dataRegistryNamespace}; ` +
                'this test does not own it',
            );
          }
          return waitForDataRegistryFeatureStoreReady(dataRegistryNamespace, 'data-registry');
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
    'should browse and create, update, and delete Data Registry collections and structured assets',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Smoke',
        '@SmokeSet1',
        '@ci-dashboard-regression-tags',
      ],
    },
    () => {
      cy.step('Log in as the configured Data Registry test user');
      cy.intercept({
        method: 'GET',
        pathname: `/data-registry/api/v1/connections/${testData.project}`,
      }).as('dataRegistryProjectConnections');
      navigateToDataRegistry(testData.project, testData.collection, {
        clearSession: true,
        verifyBrowserUser: true,
      });
      dataRegistryPage.selectProject(testData.project);

      cy.step('Load RHOAI Secret-fallback connections before seeding the browse asset');
      dataRegistryPage.findEmptyRegisterDataButton().should('not.be.disabled').click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      cy.wait('@dataRegistryProjectConnections').then(({ response }) => {
        expect(response?.statusCode, 'Data Registry connections request status').to.equal(200);
        const connectionsResponse = response?.body as
          | {
              data?: Array<{ type?: string; secret_name?: string }>;
              metadata?: {
                rhaiConnections?: Array<{ type?: string; secret_name?: string }>;
                warnings?: Array<{ code?: string; message?: string }>;
              };
            }
          | undefined;
        const connectionResponseSummary = {
          data: (connectionsResponse?.data ?? []).map(({ type, secret_name: secretName }) => ({
            type,
            secretName,
          })),
          rhaiConnections: (connectionsResponse?.metadata?.rhaiConnections ?? []).map(
            ({ type, secret_name: secretName }) => ({ type, secretName }),
          ),
          warnings: connectionsResponse?.metadata?.warnings ?? [],
        };
        const connectionResponseMessage = [
          'This spec requires selectable RHOAI Secret-fallback connections and does not use DCH',
          `response summary: ${JSON.stringify(connectionResponseSummary)}`,
        ].join('; ');
        const selectableConnections = connectionsResponse?.data ?? [];
        expect(
          selectableConnections.every(({ type }) => type === 'secret'),
          connectionResponseMessage,
        ).to.equal(true);
        const hasTestConnection = connectionsResponse?.data?.some(
          ({ type, secret_name: secretName }) =>
            type === 'secret' && secretName === testConnectionName,
        );
        expect(hasTestConnection, connectionResponseMessage).to.equal(true);
      });
      dataRegistryPage.findConnectionsError().should('not.exist');
      dataRegistryPage.findConnectionToggle().should('not.be.disabled').click();
      dataRegistryPage.findConnectionOption(testConnectionName).click();
      dataRegistryPage.findConnectionToggle().should('contain.text', testConnectionName);

      cy.step(`Seed Data Registry asset/${testData.asset} as the test user`);
      seedDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset).then(
        (created) => {
          browseAssetCreated ||= created;
        },
      );

      cy.step(`Reload ${testData.project} and verify the seeded asset is listed`);
      navigateToDataRegistry(testData.project, testData.collection, {
        expectedAsset: testData.asset,
      });
      dataRegistryPage.selectProject(testData.project);

      cy.step(`Open the ${testData.asset} data asset`);
      dataRegistryPage.findRegistryTable().should('be.visible');
      dataRegistryPage.openAsset(testData.asset);

      cy.step('Verify the data asset details page is loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.asset);
      dataRegistryPage.findAssetTypeBadge().should('contain.text', 'Data asset');

      cy.step(`Open the ${testData.collection} collection from the asset details`);
      dataRegistryPage.openCollectionFromAssetDetails(testData.collection);

      cy.step('Verify the collection details and assets are loaded');
      dataRegistryPage.findPageTitle().should('contain.text', testData.collection);
      dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
      dataRegistryPage.findCollectionDetailsCard().should('be.visible');
      dataRegistryPage.findCollectionAssetsTable().should('be.visible');

      cy.step(`Return to ${testData.project} to exercise Data Registry CRUD`);
      navigateToDataRegistry(testData.project, testData.collection, {
        expectedAsset: testData.asset,
      });
      dataRegistryPage.selectProject(testData.project);

      cy.step(`Create the ${crudCollectionName} collection`);
      dataRegistryPage.openManageCollections();
      dataRegistryPage.findCreateCollectionButton().click();
      dataRegistryPage.findCreateCollectionModal().should('be.visible');
      dataRegistryPage.findCollectionNameInput().type(crudCollectionName);
      dataRegistryPage.findCollectionDescriptionInput().type('Data Registry CRUD collection');
      cy.intercept({
        method: 'POST',
        pathname: `/data-registry/api/v1/${testData.project}/namespaces`,
      }).as('createCrudCollection');
      dataRegistryPage.findCreateCollectionSubmit().should('not.be.disabled').click();
      cy.wait('@createCrudCollection').then(({ response }) => {
        if (response && response.statusCode >= 200 && response.statusCode < 300) {
          crudCollectionCreated = true;
        }
        expect(response?.statusCode, 'Data Registry collection create response').to.be.within(
          200,
          299,
        );
      });
      dataRegistryPage.findCreateCollectionModal().should('not.exist');
      dataRegistryPage.findCollectionLink(crudCollectionName).should('be.visible');
      verifyDataRegistryCollectionExists(testData.project, crudCollectionName);
      dataRegistryPage.closeManageCollections();

      cy.step(`Register the ${crudAssetName} asset in ${crudCollectionName}`);
      dataRegistryPage.findRegisterDataButton().click();
      dataRegistryPage.findRegisterDataModal().should('be.visible');
      cy.intercept({
        method: 'POST',
        pathname:
          `/data-registry/api/v1/${testData.project}/namespaces/${crudCollectionName}` +
          '/generic-tables',
      }).as('createCrudAsset');
      cy.step('Select Structured to register a generic table');
      dataRegistryPage.findAssetTypeToggle().scrollIntoView().click();
      dataRegistryPage.findStructuredAssetTypeOption().click();
      dataRegistryPage.findConnectionsError().should('not.exist');
      dataRegistryPage.findConnectionToggle().should('not.be.disabled').click();
      dataRegistryPage.findConnectionOption(testConnectionName).click();
      dataRegistryPage.findConnectionToggle().should('contain.text', testConnectionName);
      dataRegistryPage.findDataNameInput().type(crudAssetName);
      dataRegistryPage.findDataDescriptionInput().type(crudAssetDescription);
      dataRegistryPage.findDataCollectionToggle().click();
      dataRegistryPage.findDataCollectionOption(crudCollectionName).click();
      dataRegistryPage.findRegisterDataSubmit().click();
      cy.wait('@createCrudAsset').then(({ request, response }) => {
        if (response && response.statusCode >= 200 && response.statusCode < 300) {
          crudAssetCreated = true;
        }
        expect(response?.statusCode, 'Registered asset create response').to.be.within(200, 299);
        const requestBody = request.body as {
          connection_ref?: { type?: string; secret_name?: string };
        };
        expect(
          requestBody.connection_ref?.type,
          'Registered RHOAI connection reference type',
        ).to.equal('secret');
        expect(
          requestBody.connection_ref?.secret_name,
          'Registered RHOAI connection reference name',
        ).to.equal(testConnectionName);
      });
      dataRegistryPage
        .findRegisterDataModal()
        .should('not.exist')
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
      dataRegistryPage.findEditAssetModal().should('not.exist');
      dataRegistryPage.findAssetDescription().should('contain.text', updatedCrudAssetDescription);

      cy.step(`Delete the ${crudAssetName} asset`);
      cy.intercept({
        method: 'DELETE',
        pathname:
          `/data-registry/api/v1/${testData.project}/namespaces/${crudCollectionName}` +
          `/generic-tables/${crudAssetName}`,
      }).as('deleteCrudAsset');
      dataRegistryPage.findAssetActionsToggle().click();
      dataRegistryPage.findDeleteAssetAction().click();
      dataRegistryPage.findDeleteAssetConfirmation().type(crudAssetName);
      dataRegistryPage.findDeleteAssetConfirm().click();
      cy.wait('@deleteCrudAsset').then(({ response }) => {
        expect(response?.statusCode, 'Data Registry asset delete response').to.be.oneOf([
          200, 202, 204,
        ]);
      });
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
    },
  );
});
