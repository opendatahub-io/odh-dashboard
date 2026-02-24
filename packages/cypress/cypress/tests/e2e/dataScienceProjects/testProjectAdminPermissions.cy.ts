import type { DataScienceProjectData } from '../../../types';
import { projectDetails, projectListPage } from '../../../pages/projects';
import { projectRbacPermissions } from '../../../pages/projectRbacPermissions';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_GROUP,
  LDAP_CONTRIBUTOR_USER,
} from '../../../utils/e2eUsers';
import { loadDSPFixture } from '../../../utils/dataLoader';
import { createCleanProject } from '../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { skipIfBYOIDC } from '../../../utils/skipUtils';

describe('[Automation Bug: RHOAIENG-49258] Verify that users can provide admin project permissions to non-admin users/groups', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    loadDSPFixture('e2e/dataScienceProjects/testProjectAdminPermissions.yaml')
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
      }),
  );
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
      tags: ['@Smoke', '@SmokeSet1', '@ODS-2194', '@ODS-2201', '@ODS-2208', '@Dashboard', '@Bug'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();

      cy.step('Assign admin user Project Permissions');
      projectRbacPermissions.waitForAssignRolesButton();
      projectRbacPermissions.findAssignRolesButton().click();
      projectRbacPermissions.findAssignRolesPage().should('exist');
      projectRbacPermissions
        .findAssignRolesSubjectTypeahead()
        .click()
        .type(LDAP_CONTRIBUTOR_USER.USERNAME);
      projectRbacPermissions
        .findTypeaheadOption(new RegExp(LDAP_CONTRIBUTOR_USER.USERNAME))
        .click();
      projectRbacPermissions.getManageRolesTable().toggleRole('Admin');
      projectRbacPermissions.findAssignRolesSaveButton().click();
      cy.get('body').then(($bodyEl) => {
        if ($bodyEl.find(projectRbacPermissions.getConfirmModalSelector()).length > 0) {
          projectRbacPermissions.getRoleAssignmentChangesModal().findSaveButton().click();
        }
      });

      cy.step(
        `Save the user and validate that ${LDAP_CONTRIBUTOR_USER.USERNAME} has been saved with admin permissions`,
      );
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
        '@Bug',
      ],
    },
    function testGroupPermissions() {
      skipIfBYOIDC(this, 'Groups API not available on BYOIDC clusters');

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();

      cy.step('Assign admin group Project Permissions');
      projectRbacPermissions.waitForAssignRolesButton();
      projectRbacPermissions.findAssignRolesButton().click();
      projectRbacPermissions.findAssignRolesPage().should('exist');
      projectRbacPermissions.findAssignRolesSubjectKindRadio('group').click();
      projectRbacPermissions
        .findAssignRolesSubjectTypeahead()
        .click()
        .type(LDAP_CONTRIBUTOR_GROUP.USERNAME);
      projectRbacPermissions
        .findTypeaheadOption(new RegExp(LDAP_CONTRIBUTOR_GROUP.USERNAME))
        .click();
      projectRbacPermissions.getManageRolesTable().toggleRole('Admin');
      projectRbacPermissions.findAssignRolesSaveButton().click();
      cy.get('body').then(($bodyEl) => {
        if ($bodyEl.find(projectRbacPermissions.getConfirmModalSelector()).length > 0) {
          projectRbacPermissions.getRoleAssignmentChangesModal().findSaveButton().click();
        }
      });

      cy.step(
        `Save the group and validate that ${LDAP_CONTRIBUTOR_GROUP.USERNAME} has been saved with admin permissions`,
      );
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
        '@Bug',
      ],
    },
    () => {
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify that the user has access to the created project and can access Permissions');
      projectListPage.navigate();
      projectListPage.waitForPageAndToolbar();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('permissions').click();
    },
  );
});
