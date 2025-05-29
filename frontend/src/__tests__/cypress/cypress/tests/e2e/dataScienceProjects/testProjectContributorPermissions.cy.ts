import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { permissions } from '~/__tests__/cypress/cypress/pages/permissions';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify that users can provide contributor project permissions to non-admin users', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testProjectContributorPermissions.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectContributorResourceName}-${uuid}`;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Verify that user can be added as a Contributor for a Project',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-2194', '@ODS-2201', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation, add user and provide contributor permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();

      cy.step('Assign contributor user Project Permissions');
      permissions.findAddUserButton().click();
      permissions.getUserTable().findAddInput().type(LDAP_CONTRIBUTOR_USER.USERNAME);
      permissions
        .getUserTable()
        .selectPermission(
          LDAP_CONTRIBUTOR_USER.USERNAME,
          'Contributor View and edit the project components',
        );

      cy.step(
        `Save the user and validate that ${LDAP_CONTRIBUTOR_USER.USERNAME} has been saved with Contributor permissions`,
      );
      permissions.getUserTable().findSaveNewButton().should('exist').and('be.visible').click();
      cy.contains(LDAP_CONTRIBUTOR_USER.USERNAME).should('exist');
    },
  );
  it(
    'Verify that user can access the created project as a Contributor',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-2194', '@ODS-2201', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation and validate permissions tab is accessible
      cy.step(
        'Verify that the user has access to the created project but cannot access Permissions',
      );
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      cy.log('Attempting to find permissions tab which should not be visible');
      projectDetails.findSectionTab('permissions').should('not.exist');
    },
  );
});
