import * as yaml from 'js-yaml';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  addUserToProject,
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteDataRegistryCollection,
  deleteDataRegistryBrowseAsset,
  seedDataRegistryBrowseAsset,
  verifyDataRegistryCollectionExists,
} from '../../../utils/api/dataRegistry';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const testProjectName = `data-registry-collection-e2e-${generateTestUUID()}`;
const secondCollectionName = `e2e-secondary-${generateTestUUID()}`;

describe('Data Registry - Collection Details', () => {
  let testData: Record<string, string>;
  let projectCreated = false;
  let secondCollectionCreated = false;
  let browseAssetCreated = false;

  before(() => {
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
        cy.step(`Seed Data Registry asset/${testData.asset}`);
        dataRegistryPage.navigate(testData.project, LDAP_ADMIN_USER);
        dataRegistryPage.selectProject(testData.project);
        return seedDataRegistryBrowseAsset(
          testData.project,
          testData.collection,
          testData.asset,
        ).then((created) => {
          browseAssetCreated = created;
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
        dataRegistryPage.findCreateCollectionModal().should('be.visible');
        dataRegistryPage.findCollectionNameInput().type(secondCollectionName);
        dataRegistryPage
          .findCollectionDescriptionInput()
          .type('Additional collection for collection details E2E');
        dataRegistryPage.findCreateCollectionSubmit().should('not.be.disabled').click();
        return dataRegistryPage
          .findCollectionLink(secondCollectionName)
          .should('be.visible')
          .then(() => {
            secondCollectionCreated = true;
            return verifyDataRegistryCollectionExists(testData.project, secondCollectionName);
          });
      });
  });

  after(() => {
    if (!browseAssetCreated && !secondCollectionCreated && !projectCreated) {
      return;
    }
    return ensureAdminOcSession()
      .then(() =>
        secondCollectionCreated
          ? deleteDataRegistryCollection(testData.project, secondCollectionName)
          : undefined,
      )
      .then(() =>
        browseAssetCreated
          ? deleteDataRegistryBrowseAsset(testData.project, testData.collection, testData.asset)
          : undefined,
      )
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

  beforeEach(() => {
    dataRegistryPage.navigate(testData.project, LDAP_ADMIN_USER);
    dataRegistryPage.selectProject(testData.project);
    return dataRegistryPage.findAssetLink(testData.asset).should('be.visible');
  });

  it('should display collection detail page', () => {
    // Navigate to the collection through the asset details link.
    dataRegistryPage.openAsset(testData.asset);
    dataRegistryPage.openCollectionFromAssetDetails(testData.collection);

    // Verify collection detail page loaded
    dataRegistryPage.findPageTitle().should('contain.text', testData.collection);
    dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
    dataRegistryPage.findCollectionDescription().should('exist');
  });

  it('should display collection details card with correct information', () => {
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
  });

  it('should display data assets table', () => {
    dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

    // Verify data assets card
    dataRegistryPage.findDataAssetsCard().should('exist');
    dataRegistryPage.findCollectionAssetsTable().should('exist');

    // Verify table has headers
    dataRegistryPage
      .findCollectionAssetsTableHeaders()
      .should('contain', 'Name')
      .and('contain', 'Type')
      .and('contain', 'Format');
  });

  it('should navigate to asset detail from collection assets table', () => {
    dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

    // Click on an asset name
    dataRegistryPage.findCollectionAssetLink(testData.asset).click();

    // Verify navigated to asset detail page
    dataRegistryPage.shouldHaveAssetDetailUrl(
      testData.project,
      testData.collection,
      testData.asset,
    );
    dataRegistryPage.findAssetTypeBadge().should('contain.text', 'Data asset');
  });

  it('should show delete collection disabled when collection has assets', () => {
    dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

    // Open actions menu
    dataRegistryPage.findCollectionActionsToggle().click();

    // Verify delete is disabled
    dataRegistryPage.findCollectionDeleteAction().should('have.attr', 'aria-disabled', 'true');
  });

  it('should open register data modal', () => {
    dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

    // Open actions menu
    dataRegistryPage.findCollectionActionsToggle().click();

    // Click register data
    dataRegistryPage.findCollectionRegisterDataAction().click();

    // Verify modal opened
    dataRegistryPage.findRegisterDataModal().should('be.visible');
  });

  it('should open manage collections modal with all collections', () => {
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
  });

  it('should navigate to collection detail from manage collections modal', () => {
    // Open manage collections
    dataRegistryPage.openManageCollections();

    // Click on a collection name
    dataRegistryPage.findCollectionLink(testData.collection).click();

    // Verify navigated to collection detail
    dataRegistryPage.shouldHaveCollectionDetailUrl(testData.project, testData.collection);
    dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
  });

  it('should show trash icon for delete in manage collections', () => {
    // Open manage collections
    dataRegistryPage.openManageCollections();

    // Verify trash icon buttons exist
    dataRegistryPage.findCollectionDeleteButtons().should('exist');
  });
});
