import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { permissions } from '~/__tests__/cypress/cypress/pages/permissions';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_GROUP,
  LDAP_CONTRIBUTOR_USER,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify that users can provide admin project permissions to non-admin users/groups', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testProjectAdminPermissions.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectPermissionResourceName}-${uuid}`;
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
    'Verify that user can be added as an Admin for a Project',
    {
      tags: ['@Smoke', '@SmokeSet1', '@ODS-2194', '@ODS-2201', '@ODS-2208', '@Dashboard'],
    },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation, add user and provide admin permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();

      cy.step('Assign admin user Project Permissions');
      permissions.findAddUserButton().click();
      permissions.getUserTable().findAddInput().type(LDAP_CONTRIBUTOR_USER.USERNAME);
      permissions
        .getUserTable()
        .selectPermission(
          LDAP_CONTRIBUTOR_USER.USERNAME,
          'Admin Edit the project and manage user access',
        );

      cy.step(
        `Save the user and validate that ${LDAP_CONTRIBUTOR_USER.USERNAME} has been saved with admin permissions`,
      );
      permissions.getUserTable().findSaveNewButton().should('exist').and('be.visible').click();
      cy.contains(LDAP_CONTRIBUTOR_USER.USERNAME).should('exist');
    },
  );
  it(
    'Verify user can assign access permissions to user group',
    {
      tags: [
        '@Smoke',
        '@SmokeSet1',
        '@ODS-2194',
        '@ODS-2201',
        '@ODS-2208',
        '@Dashboard',
        '@NonConcurrent',
      ],
    },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation, add group and provide admin permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();

      cy.step('Assign admin group Project Permissions');
      permissions.findAddGroupButton().click();
      permissions.getGroupTable().addGroupName(LDAP_CONTRIBUTOR_GROUP.USERNAME);
      permissions.getGroupTable().selectAdminOption();
      cy.step(
        `Save the group and validate that ${LDAP_CONTRIBUTOR_GROUP.USERNAME} has been saved with admin permissions`,
      );
      permissions.getGroupTable().findSaveNewButton().should('exist').and('be.visible').click();
      cy.contains(LDAP_CONTRIBUTOR_GROUP.USERNAME).should('exist');
    },
  );
  it(
    'Verify that user can access the created project with Admin rights',
    {
      tags: [
        '@Smoke',
        '@SmokeSet1',
        '@ODS-2194',
        '@ODS-2201',
        '@ODS-2208',
        '@Dashboard',
        '@NonConcurrent',
      ],
    },
    () => {
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation and validate permissions tab is accessible
      cy.step('Verify that the user has access to the created project and can access Permissions');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();
    },
  );
});
