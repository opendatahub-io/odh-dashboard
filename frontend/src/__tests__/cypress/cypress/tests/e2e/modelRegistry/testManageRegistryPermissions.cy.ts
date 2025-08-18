import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { modelRegistryPermissions } from '#~/__tests__/cypress/cypress/pages/modelRegistryPermissions';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  checkModelRegistry,
  checkModelRegistryAvailable,
  createAndVerifyDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  getModelRegistryNamespace,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelRegistry';
import { loadManagePermissionsFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type { ManageRegistryPermissionsTestData } from '#~/__tests__/cypress/cypress/types';
import { modelRegistrySettings } from '#~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { checkModelRegistryRoleBindings } from '#~/__tests__/cypress/cypress/utils/oc_commands/roleBindings';

describe('Verify model registry permissions can be managed', () => {
  let testData: ManageRegistryPermissionsTestData;
  let registryName: string;
  let testProjectName: string;
  const uuid = generateTestUUID();

  before(() => {
    cy.step('Load test data from fixture');
    loadManagePermissionsFixture('e2e/modelRegistry/testManageRegistryPermissions.yaml').then(
      (fixtureData: ManageRegistryPermissionsTestData) => {
        testData = fixtureData;
        registryName = `${testData.registryNamePrefix}-${uuid}`;
        testProjectName = `${testData.testProjectNamePrefix}-${uuid}`;

        // Create and verify SQL database
        cy.step('Create and verify SQL database for model registry');
        createAndVerifyDatabase().should('be.true');

        // creates a model registry
        cy.step('Create a model registry using YAML');
        createModelRegistryViaYAML(registryName);

        cy.step('Verify model registry is created');
        checkModelRegistry(registryName).should('be.true');

        cy.step('Wait for model registry to be in Available state');
        checkModelRegistryAvailable(registryName).should('be.true');

        // creates a test project for permissions testing
        cy.step('Create a test project for permissions testing');
        createCleanProject(testProjectName);
      },
    );
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Admin can add user permissions to model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Navigate to permissions management');
      modelRegistrySettings.managePermissions(registryName);

      cy.step('Add contributor user to model registry permissions');
      modelRegistryPermissions.getUsersContent().findAddUserButton().click();
      modelRegistryPermissions
        .getUsersContent()
        .getUserTable()
        .findAddInput()
        .type(LDAP_CONTRIBUTOR_USER.USERNAME);
      modelRegistryPermissions.getUsersContent().getUserTable().findSaveNewButton().click();

      cy.step('Verify contributor user was added');
      cy.contains(LDAP_CONTRIBUTOR_USER.USERNAME, { timeout: 10000 }).should('be.visible');

      cy.step('Verify role binding was created in backend');
      checkModelRegistryRoleBindings(
        registryName,
        getModelRegistryNamespace(),
        LDAP_CONTRIBUTOR_USER.USERNAME,
      ).should('be.true');
    },
  );

  it(
    'Contributor user can access model registry after being added',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin(`/modelRegistry/${registryName}`, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify contributor user can access model registry');
      cy.url({ timeout: 30000 }).should('include', `/modelRegistry/${registryName}`);
      cy.contains(registryName, { timeout: 30000 }).should('be.visible');
    },
  );

  it(
    'Admin can remove user permissions from model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Navigate to permissions management');
      modelRegistrySettings.managePermissions(registryName);

      cy.step('Remove contributor user from model registry permissions');
      modelRegistryPermissions
        .getUsersContent()
        .getUserTable()
        .getTableRow(LDAP_CONTRIBUTOR_USER.USERNAME)
        .findKebabAction('Delete')
        .click();

      cy.step('Verify contributor user was removed');
      cy.contains(LDAP_CONTRIBUTOR_USER.USERNAME, { timeout: 10000 }).should('not.exist');
    },
  );

  it(
    'Contributor user cannot access model registry after being removed',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin(`/modelRegistry/${registryName}`, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify contributor user sees request access message');
      cy.contains('Request access to model registries', { timeout: 30000 }).should('be.visible');
    },
  );

  it(
    'Admin can add group permissions to model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Navigate to permissions management');
      modelRegistrySettings.managePermissions(registryName);

      cy.step('Add rhods-users group to model registry permissions');
      modelRegistryPermissions.getUsersContent().findAddGroupButton().click();
      modelRegistryPermissions
        .getUsersContent()
        .getGroupTable()
        .findNameSelect()
        .type(testData.rhodsUsersGroup);
      cy.contains(testData.rhodsUsersGroup, { timeout: 10000 }).should('be.visible').click();
      modelRegistryPermissions.getUsersContent().getGroupTable().findSaveNewButton().click();

      cy.step('Verify rhods-users group was added');
      cy.contains(testData.rhodsUsersGroup, { timeout: 10000 }).should('be.visible');

      cy.step('Verify role binding was created in backend');
      checkModelRegistryRoleBindings(
        registryName,
        getModelRegistryNamespace(),
        testData.rhodsUsersGroup,
      ).should('be.true');
    },
  );

  it(
    'User can access model registry through group membership',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin(`/modelRegistry/${registryName}`, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify user can access model registry through group membership');
      cy.url({ timeout: 30000 }).should('include', `/modelRegistry/${registryName}`);
      cy.contains(registryName, { timeout: 30000 }).should('be.visible');
    },
  );

  it(
    'Admin can remove group permissions from model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Navigate to permissions management');
      modelRegistrySettings.managePermissions(registryName);

      cy.step('Remove rhods-users group from model registry permissions');
      modelRegistryPermissions
        .getUsersContent()
        .getGroupTable()
        .getTableRow(testData.rhodsUsersGroup)
        .findKebabAction('Delete')
        .click();

      cy.step('Verify rhods-users group was removed');
      cy.contains(testData.rhodsUsersGroup, { timeout: 10000 }).should('not.exist');
    },
  );

  it(
    'User cannot access model registry after group is removed',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin(`/modelRegistry/${registryName}`, LDAP_CONTRIBUTOR_USER);

      cy.step('Verify user sees request access message after group removal');
      cy.contains('Request access to model registries', { timeout: 10000 }).should('be.visible');
    },
  );

  it(
    'Admin can add project permissions to model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Navigate to permissions management');
      modelRegistrySettings.managePermissions(registryName);

      cy.step('Switch to Projects tab');
      modelRegistryPermissions.findProjectTab().click();

      cy.step('Add the created project to model registry permissions');
      modelRegistryPermissions.getProjectsContent().findAddProjectButton().click();
      modelRegistryPermissions
        .getProjectsContent()
        .getProjectTable()
        .findNameSelect()
        .type(testProjectName);
      cy.contains(testProjectName, { timeout: 10000 }).should('be.visible').click();
      modelRegistryPermissions.getProjectsContent().getProjectTable().findSaveNewButton().click();

      cy.step('Verify created project was added to registry permissions');
      cy.contains(testProjectName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify role binding was created in backend');
      checkModelRegistryRoleBindings(
        registryName,
        getModelRegistryNamespace(),
        `system:serviceaccounts:${testProjectName}`,
      ).should('be.true');

      cy.step('Remove the created project from model registry permissions');
      modelRegistryPermissions
        .getProjectsContent()
        .getProjectTable()
        .getTableRow(testProjectName)
        .findKebabAction('Delete')
        .click();

      cy.step('Verify created project was deleted from registry permissions');
      cy.contains(testProjectName, { timeout: 10000 }).should('not.exist');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Delete the test project');
    deleteOpenShiftProject(testProjectName, { wait: false, ignoreNotFound: true });

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase();
  });
});
