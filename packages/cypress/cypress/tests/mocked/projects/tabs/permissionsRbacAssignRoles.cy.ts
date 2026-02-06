/**
 * Tests for the Assign Roles page with projectRBAC feature enabled.
 * Covers discard changes modal, confirmation modal, save operations, and page scenarios.
 */
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  initProjectRbacIntercepts,
  mockRoleBindingK8sResource,
  mockUserRoleBindingSubject,
  NAMESPACE,
} from './permissionsRbacTestUtils';
import { projectRbacPermissions } from '../../../../pages/projectRbacPermissions';
import { RoleBindingModel } from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';

describe('Assign Roles Page - Discard Changes Modal', () => {
  const discardModal = projectRbacPermissions.getDiscardChangesModal();
  const manageRolesTable = projectRbacPermissions.getManageRolesTable();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should show discard modal when switching subject kind with unsaved changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user from typeahead
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Make a role change (toggle a role)
    manageRolesTable.toggleRole('Admin');

    // Try to switch subject kind
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').click();

    // Discard modal should appear
    discardModal.find().should('exist');
    discardModal.shouldContainMessage(/Editing the subject kind will discard your changes/);

    // Cancel should close modal and keep current state
    discardModal.findCancelButton().click();
    discardModal.find().should('not.exist');
    projectRbacPermissions.findAssignRolesSubjectKindRadio('user').should('be.checked');
  });

  it('should discard changes when clicking Discard in the modal', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Make a role change
    manageRolesTable.toggleRole('Admin');

    // Switch subject kind
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').click();

    // Click Discard
    discardModal.findDiscardButton().click();

    // Modal should close, subject kind should change, and subject name should be cleared
    discardModal.find().should('not.exist');
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').should('be.checked');
  });

  it('should NOT show discard modal when switching directly from new user to new user without clearing', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Type a new user (not in existing list)
    projectRbacPermissions.findAssignRolesSubjectTypeahead().type('new-user-1');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "new-user-1"/).click();

    // Make a role change (select Admin)
    manageRolesTable.findRoleCheckbox('Admin').should('not.be.checked');
    manageRolesTable.toggleRole('Admin');
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');

    // Type another new user directly in the typeahead - modal should NOT appear for new->new switch
    projectRbacPermissions.findAssignRolesSubjectTypeahead().clear().type('new-user-2');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "new-user-2"/).click();

    // No discard modal should appear (new->new switch doesn't require confirmation)
    discardModal.find().should('not.exist');

    // Selections are reset for new users (Admin should not be checked)
    manageRolesTable.findRoleCheckbox('Admin').should('not.be.checked');
  });

  it('should show discard modal when clearing a new user with unsaved changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Type a new user (not in existing list)
    projectRbacPermissions.findAssignRolesSubjectTypeahead().type('new-user-1');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "new-user-1"/).click();

    // Make a role change (select Admin)
    manageRolesTable.findRoleCheckbox('Admin').should('not.be.checked');
    manageRolesTable.toggleRole('Admin');
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');

    // Click clear button - modal SHOULD appear because there are unsaved changes
    projectRbacPermissions.findAssignRolesSubjectClearButton().click();

    // Discard modal should appear
    discardModal.find().should('exist');
    discardModal.shouldContainMessage(/Editing the subject name will discard your changes/);

    // Confirm discard
    discardModal.findDiscardButton().click();
    discardModal.find().should('not.exist');
  });

  it('should show discard modal when switching from existing to new user with changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Make a role change
    manageRolesTable.toggleRole('Admin');

    // Switch to a new user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().clear().type('brand-new-user');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "brand-new-user"/).click();

    // Discard modal should appear
    discardModal.find().should('exist');
    discardModal.shouldContainMessage(/Editing the subject name will discard your changes/);
  });

  it('should show discard modal when clearing selection with unsaved changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Make a role change
    manageRolesTable.toggleRole('Admin');

    // Clear the selection using the clear button
    projectRbacPermissions.findAssignRolesSubjectClearButton().click();

    // Discard modal should appear
    discardModal.find().should('exist');
    discardModal.shouldContainMessage(/Editing the subject name will discard your changes/);
  });

  it('should show navigation blocker modal when navigating away with unsaved changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Make a role change
    manageRolesTable.toggleRole('Admin');

    // Try to navigate away via breadcrumb
    projectRbacPermissions.findAssignRolesBreadcrumbProjects().click();

    // Navigation blocker modal should appear
    const navBlockerModal = projectRbacPermissions.getNavigationBlockerModal();
    navBlockerModal.find().should('exist');

    // Cancel should stay on page
    navBlockerModal.findCancelButton().click();
    navBlockerModal.find().should('not.exist');
    projectRbacPermissions.findAssignRolesPage().should('exist');
  });
});

describe('Assign Roles Page - Confirmation Modal and Save', () => {
  const manageRolesTable = projectRbacPermissions.getManageRolesTable();
  const confirmModal = projectRbacPermissions.getRoleAssignmentChangesModal();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should show confirmation modal with changes summary when clicking Save', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Unassign a role (Admin is currently assigned)
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');
    manageRolesTable.toggleRole('Admin');

    // Click Save button
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal should appear
    confirmModal.find().should('exist');

    // Should show unassigning section
    confirmModal.find().within(() => {
      cy.contains('Unassigning').should('exist');
      cy.contains('Admin').should('exist');
    });
  });

  it('should show custom role warning in confirmation modal when unassigning non-reversible roles', () => {
    // Create a RoleBinding with a custom (non-reversible) role
    const userSubject = mockUserRoleBindingSubject({ name: 'custom-role-user' });
    const rbCustom = mockRoleBindingK8sResource({
      name: 'rb-custom-role',
      namespace: NAMESPACE,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'view', // 'view' is not admin/edit/dashboard, so it's irreversible
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    initProjectRbacIntercepts({ items: [rbCustom] });
    projectRbacPermissions.visit(NAMESPACE);

    // Use Manage permissions action on the user
    projectRbacPermissions.getUsersTable().findManageRolesAction('custom-role-user').click();

    // The custom role should be checked (currently assigned)
    manageRolesTable.findRoleCheckbox('view').should('be.checked');

    // Unassign the custom role
    manageRolesTable.toggleRole('view');

    // Click Save button
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal should show warning about irreversible roles
    confirmModal.find().should('exist');
    confirmModal.findCustomRoleWarning().should('exist');
    confirmModal.findCustomRoleWarning().should('contain.text', 'reassign');
  });

  it('should apply role assignments via API and navigate back on successful save', () => {
    // Use empty role bindings so there's no existing RoleBinding to patch
    initProjectRbacIntercepts({ items: [] });

    // Intercept the POST for creating a new RoleBinding
    cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as(
      'createRoleBinding',
    );

    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Type a new user name
    projectRbacPermissions.findAssignRolesSubjectTypeahead().type('brand-new-user');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "brand-new-user"/).click();

    // Select a role - use dashboard-role since no existing RoleBinding for it
    manageRolesTable.toggleRole('dashboard-role');

    // Click Save button
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal appears
    confirmModal.find().should('exist');

    // Verify the modal shows assigning section
    confirmModal.findAssigningSection().should('exist').and('contain.text', 'dashboard-role');

    // Click confirm - wait for button to be visible first
    confirmModal.findSaveButton().should('be.visible').and('not.be.disabled').click();

    // Wait for API call - should create a new RoleBinding since no existing one
    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.body).to.containSubset({
        roleRef: { kind: 'Role', name: 'dashboard-role' },
        subjects: [{ kind: 'User', name: 'brand-new-user' }],
      });
    });

    // Should navigate back to permissions tab
    cy.url().should('include', '/projects/test-project?section=permissions');
  });

  it('should apply role unassignment via DELETE API call', () => {
    const userSubject = mockUserRoleBindingSubject({ name: 'user-to-unassign' });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-admin-to-delete',
      namespace: NAMESPACE,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    initProjectRbacIntercepts({ items: [rbAdmin] });

    // Intercept DELETE
    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: NAMESPACE, name: 'rb-admin-to-delete' },
      mock200Status({}),
    ).as('deleteRoleBinding');

    projectRbacPermissions.visit(NAMESPACE);

    // Use Manage permissions action
    projectRbacPermissions.getUsersTable().findManageRolesAction('user-to-unassign').click();

    // Unassign Admin
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');
    manageRolesTable.toggleRole('Admin');

    // Save
    projectRbacPermissions.findAssignRolesSaveButton().click();
    confirmModal.find().should('exist');
    confirmModal.findSaveButton().click();

    // Verify DELETE was called
    cy.wait('@deleteRoleBinding');

    // Should navigate back
    cy.url().should('include', '/projects/test-project?section=permissions');
  });

  it('should cancel confirmation modal without applying changes', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user and make changes
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();
    manageRolesTable.toggleRole('Admin');

    // Click Save
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal appears
    confirmModal.find().should('exist');

    // Click Cancel
    confirmModal.findCancelButton().click();

    // Modal closes, still on assign roles page
    confirmModal.find().should('not.exist');
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Changes should still be there (Admin still unchecked)
    manageRolesTable.findRoleCheckbox('Admin').should('not.be.checked');
  });

  it('should handle multiple role changes in one save', () => {
    initProjectRbacIntercepts();

    // Intercept POST for new RoleBinding
    cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as(
      'createRoleBinding',
    );

    // Intercept DELETE for existing RoleBinding
    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: NAMESPACE, name: 'rb-user-admin' },
      mock200Status({}),
    ).as('deleteRoleBinding');

    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Unassign Admin (currently assigned)
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');
    manageRolesTable.toggleRole('Admin');

    // Assign dashboard-role (not currently assigned)
    manageRolesTable.findRoleCheckbox('dashboard-role').should('not.be.checked');
    manageRolesTable.toggleRole('dashboard-role');

    // Click Save
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal should show both assigning and unassigning
    confirmModal.find().should('exist');
    confirmModal.find().within(() => {
      cy.contains('Assigning').should('exist');
      cy.contains('dashboard-role').should('exist');
      cy.contains('Unassigning').should('exist');
      cy.contains('Admin').should('exist');
    });

    // Click confirm
    confirmModal.findSaveButton().click();

    // Both API calls should be made
    cy.wait('@createRoleBinding');
    cy.wait('@deleteRoleBinding');
  });
});

describe('Assign Roles Page - Additional Scenarios', () => {
  const manageRolesTable = projectRbacPermissions.getManageRolesTable();
  const confirmModal = projectRbacPermissions.getRoleAssignmentChangesModal();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should disable Save button when no subject is selected', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Without selecting a subject, Save button should be disabled
    projectRbacPermissions.findAssignRolesSaveButton().should('be.disabled');
  });

  it('should disable Save button when no changes are made', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user (Admin is already checked)
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Without making any changes, Save button should be disabled
    projectRbacPermissions.findAssignRolesSaveButton().should('be.disabled');
  });

  it('should enable Save button when changes are made', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Select an existing user
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Toggle a role to make changes
    manageRolesTable.toggleRole('Admin');

    // Save button should now be enabled
    projectRbacPermissions.findAssignRolesSaveButton().should('be.enabled');
  });

  it('should pre-select assigned roles for existing subjects', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Select an existing user who has Admin and Contributor roles
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();
    projectRbacPermissions.findTypeaheadOption('test-user-1').click();

    // Admin and Contributor should be pre-checked
    manageRolesTable.findRoleCheckbox('Admin').should('be.checked');
    manageRolesTable.findRoleCheckbox('Contributor').should('be.checked');
  });

  it('should show no pre-selected roles for new subjects', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Type a new user name
    projectRbacPermissions.findAssignRolesSubjectTypeahead().type('brand-new-user');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "brand-new-user"/).click();

    // No roles should be pre-checked
    manageRolesTable.findRoleCheckbox('Admin').should('not.be.checked');
    manageRolesTable.findRoleCheckbox('Contributor').should('not.be.checked');
  });

  it('should handle group assignment flow', () => {
    // Use empty role bindings so there's no existing RoleBinding to patch
    initProjectRbacIntercepts({ items: [] });

    // Intercept the POST for creating a new RoleBinding
    cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as(
      'createRoleBinding',
    );

    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();
    projectRbacPermissions.findAssignRolesPage().should('exist');

    // Switch to group kind
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').click();

    // Type a new group name
    projectRbacPermissions.findAssignRolesSubjectTypeahead().type('new-team');
    projectRbacPermissions.findTypeaheadOption(/Assign role to "new-team"/).click();

    // Select a role - use dashboard-role since no existing RoleBinding
    manageRolesTable.toggleRole('dashboard-role');

    // Click Save
    projectRbacPermissions.findAssignRolesSaveButton().click();

    // Confirmation modal appears
    confirmModal.find().should('exist');
    confirmModal.findAssigningSection().should('exist').and('contain.text', 'dashboard-role');

    // Click confirm - wait for button to be visible first
    confirmModal.findSaveButton().should('be.visible').and('not.be.disabled').click();

    // Wait for API call - should create a new RoleBinding
    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.body).to.containSubset({
        roleRef: { kind: 'Role', name: 'dashboard-role' },
        subjects: [{ kind: 'Group', name: 'new-team' }],
      });
    });
  });

  it('should show existing subjects in typeahead dropdown', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Click on typeahead
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();

    // Existing users should be shown
    projectRbacPermissions.findTypeaheadOption('test-user-1').should('exist');
  });

  it('should show existing groups in typeahead when group kind is selected', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Switch to group kind
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').click();

    // Click on typeahead
    projectRbacPermissions.findAssignRolesSubjectTypeahead().click();

    // Existing groups should be shown
    projectRbacPermissions.findTypeaheadOption('test-group-1').should('exist');
  });

  it('should navigate back via breadcrumb', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate to assign roles page
    projectRbacPermissions.findAssignRolesButton().click();

    // Click on project breadcrumb (without unsaved changes)
    projectRbacPermissions.findAssignRolesBreadcrumbProject().click();

    // Should navigate back to permissions tab
    cy.url().should('include', `/projects/${NAMESPACE}?section=permissions`);
  });

  it('should lock subject as read-only in manage mode', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Use Manage permissions action to navigate
    projectRbacPermissions.getUsersTable().findManageRolesAction('test-user-1').click();

    // Subject should be displayed as read-only
    projectRbacPermissions.findAssignRolesSubjectReadonly().should('contain.text', 'test-user-1');

    // Typeahead should not exist
    projectRbacPermissions.findAssignRolesSubjectTypeahead().should('not.exist');

    // Subject kind radios should not be visible in manage mode
    projectRbacPermissions.findAssignRolesSubjectKindRadio('user').should('not.exist');
    projectRbacPermissions.findAssignRolesSubjectKindRadio('group').should('not.exist');
  });

  it('should show page title as "Manage permissions" when in manage mode', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Use Manage permissions action
    projectRbacPermissions.getUsersTable().findManageRolesAction('test-user-1').click();

    // Check page title
    cy.contains('h1', 'Manage permissions').should('exist');
  });

  it('should show page title as "Manage permissions" when in assign mode', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Navigate via toolbar button
    projectRbacPermissions.findAssignRolesButton().click();

    // Check page title
    cy.contains('h1', 'Manage permissions').should('exist');
  });
});
