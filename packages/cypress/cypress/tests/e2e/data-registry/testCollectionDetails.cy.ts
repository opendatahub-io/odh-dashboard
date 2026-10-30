import * as yaml from 'js-yaml';
import dataRegistryPage from '../../../pages/dataRegistry/dataRegistryPage';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import {
  addUserToProject,
  deleteOpenShiftProjectBestEffort,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteDataRegistryCollection,
  deleteDataRegistryBrowseAsset,
  seedDataRegistryBrowseAsset,
  verifyDataRegistryCollectionExists,
  waitForDataRegistryProjectCollectionsApi,
} from '../../../utils/api/dataRegistry';
import {
  createFeatureStoreCR,
  waitForDataRegistryFeatureStoreReady,
  waitForDataRegistryNamespace,
} from '../../../utils/oc_commands/featureStoreResources';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const testProjectName = `data-registry-collection-e2e-${generateTestUUID()}`;
const secondCollectionName = `e2e-secondary-${generateTestUUID()}`;
describe('Data Registry - Collection Details', () => {
  let testData: Record<string, string>;
  let projectCreated = false;
  let dataRegistryNamespace: string;
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
        return createCleanProject(testProjectName, () => {
          projectCreated = true;
        });
      })
      .then(() => {
        cy.step('Grant the administrator access to the test project');
        return addUserToProject(testProjectName, LDAP_ADMIN_USER.USERNAME, 'admin').then(() =>
          waitForUserProjectAccess(testProjectName, LDAP_ADMIN_USER.USERNAME),
        );
      })
      .then(() =>
        waitForDataRegistryNamespace().then((namespace) => {
          dataRegistryNamespace = namespace;
        }),
      )
      .then(() => {
        cy.step('Create FeatureStore/data-registry for Data Registry');
        // This is the cluster-wide Data Registry service shared by the E2E specs. Create it
        // when absent, but keep it running after this spec so the next spec does not restart it.
        return createFeatureStoreCR(dataRegistryNamespace, 'data-registry', {
          dataRegistryEnabled: true,
        }).then((created) => {
          if (!created) {
            cy.log(`Reusing shared FeatureStore/data-registry in ${dataRegistryNamespace}`);
          }
          return waitForDataRegistryFeatureStoreReady(dataRegistryNamespace, 'data-registry');
        });
      })
      .then(() => {
        dataRegistryPage.navigate(testData.project, LDAP_ADMIN_USER);
        dataRegistryPage.selectProject(testData.project);
        cy.step(`Wait for Data Registry API for project/${testData.project}`);
        return waitForDataRegistryProjectCollectionsApi(testData.project);
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
        cy.intercept({
          method: 'POST',
          pathname: `/data-registry/api/v1/${testData.project}/namespaces`,
        }).as('createSecondCollection');
        dataRegistryPage.findCreateCollectionSubmit().should('not.be.disabled').click();
        return cy
          .wait('@createSecondCollection')
          .then(({ response }) => {
            if (response && response.statusCode >= 200 && response.statusCode < 300) {
              secondCollectionCreated = true;
            }
            expect(response?.statusCode, 'Data Registry collection create response').to.be.within(
              200,
              299,
            );
          })
          .then(() => dataRegistryPage.findCreateCollectionRow().should('not.exist'))
          .then(() => dataRegistryPage.findManageCollectionsModal().should('be.visible'))
          .then(() =>
            dataRegistryPage.findCollectionLink(secondCollectionName).should('be.visible'),
          )
          .then(() => verifyDataRegistryCollectionExists(testData.project, secondCollectionName));
      });
  });

  after(() => {
    if (!browseAssetCreated && !secondCollectionCreated && !projectCreated) {
      return;
    }

    const cleanupErrors: string[] = [];
    const runBestEffortCleanup = (
      label: string,
      cleanup: (() => Cypress.Chainable<string | false>) | undefined,
    ): Cypress.Chainable<void> => {
      if (!cleanup) {
        return cy.wrap(undefined as void, { log: false });
      }
      cy.step(`Cleanup ${label}`);
      return cleanup().then((failureMessage) => {
        if (failureMessage) {
          cleanupErrors.push(`${label}: ${failureMessage}`);
          cy.log(`Cleanup failed: ${label}: ${failureMessage}`);
        }
        return cy.wrap(undefined as void, { log: false });
      });
    };

    return ensureAdminOcSession()
      .then(() =>
        runBestEffortCleanup(
          `collection ${secondCollectionName}`,
          secondCollectionCreated
            ? () =>
                deleteDataRegistryCollection(testData.project, secondCollectionName, {
                  continueOnError: true,
                })
            : undefined,
        ),
      )
      .then(() =>
        runBestEffortCleanup(
          `browse asset ${testData.asset}`,
          browseAssetCreated
            ? () =>
                deleteDataRegistryBrowseAsset(
                  testData.project,
                  testData.collection,
                  testData.asset,
                  { continueOnError: true },
                )
            : undefined,
        ),
      )
      .then(() =>
        runBestEffortCleanup(
          `project ${testProjectName}`,
          projectCreated
            ? () =>
                deleteOpenShiftProjectBestEffort(testProjectName).then((result) =>
                  result.exitCode === 0
                    ? false
                    : `oc delete exited ${result.exitCode}: ${result.stderr || result.stdout}`,
                )
            : undefined,
        ),
      )
      .then(() => {
        if (cleanupErrors.length > 0) {
          throw new Error(`Data Registry cleanup failed:\n${cleanupErrors.join('\n')}`);
        }
      });
  });

  beforeEach(() => {
    dataRegistryPage.navigate(testData.project, LDAP_ADMIN_USER);
    dataRegistryPage.selectProject(testData.project);
    return dataRegistryPage.findAssetLink(testData.asset).should('be.visible');
  });

  it(
    'should display collection detail page',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
    },
    () => {
      dataRegistryPage.navigateToCollection(
        testData.project,
        secondCollectionName,
        LDAP_ADMIN_USER,
      );

      // Verify collection detail page loaded
      dataRegistryPage.findPageTitle().should('contain.text', secondCollectionName);
      dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
      dataRegistryPage
        .findCollectionDescription(testData.secondaryCollectionDescription)
        .should('be.visible');
    },
  );

  it(
    'should display collection details card with correct information',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
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
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
    },
    () => {
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
    },
  );

  it(
    'should navigate to asset detail from collection assets table',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
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
      dataRegistryPage.findAssetTypeBadge().should('contain.text', 'Data asset');
    },
  );

  it(
    'should show delete collection disabled when collection has assets',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
    },
    () => {
      dataRegistryPage.navigateToCollection(testData.project, testData.collection, LDAP_ADMIN_USER);

      // Open actions menu
      dataRegistryPage.findCollectionActionsToggle().click();

      // Verify delete is disabled
      dataRegistryPage.findCollectionDeleteAction().should('have.class', 'pf-m-aria-disabled');
    },
  );

  it(
    'should open register data modal',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
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
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
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
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
    },
    () => {
      // Open manage collections
      dataRegistryPage.openManageCollections();

      // Click on a collection name
      dataRegistryPage.findCollectionLink(testData.collection).click();

      // Verify navigated to collection detail
      dataRegistryPage.shouldHaveCollectionDetailUrl(testData.project, testData.collection);
      dataRegistryPage.findCollectionTypeBadge().should('contain.text', 'Collection');
    },
  );

  it(
    'should show trash icon for delete in manage collections',
    {
      tags: [
        '@Dashboard',
        '@DataRegistry',
        '@Sanity',
        '@SanitySet1',
        '@ci-dashboard-regression-tags',
        '@NonConcurrent',
      ],
    },
    () => {
      // Open manage collections
      dataRegistryPage.openManageCollections();

      // Verify trash icon buttons exist
      dataRegistryPage.findCollectionDeleteButtons().should('exist');
    },
  );
});
