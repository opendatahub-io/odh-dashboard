import type { projectRbacPermissions } from '../pages/projectRbacPermissions';

export type AssignRoleViaProjectRbacOptions = {
  subjectName: string;
  subjectKind: 'user' | 'group';
  roleName: string;
};

/**
 * Assigns a role to a user or group via the project RBAC "Manage permissions" flow.
 * Assumes the Permissions tab is already open and the Assign roles button is available.
 * Waits for the assignment to complete and the modal to close before returning.
 */
export function assignRoleViaProjectRbac(
  projectRbac: typeof projectRbacPermissions,
  options: AssignRoleViaProjectRbacOptions,
): void {
  const { subjectName, subjectKind, roleName } = options;

  projectRbac.waitForAssignRolesButton();
  projectRbac.findAssignRolesButton().click();
  projectRbac.findAssignRolesPage().should('exist');

  if (subjectKind === 'group') {
    projectRbac.findAssignRolesSubjectKindRadio('group').click();
  }

  projectRbac.findAssignRolesSubjectTypeahead().click().type(subjectName);
  projectRbac.findTypeaheadOption(new RegExp(subjectName)).click();
  projectRbac.getManageRolesTable().toggleRole(roleName);
  projectRbac.findAssignRolesSaveButton().click();

  cy.get('body').then(($bodyEl) => {
    if ($bodyEl.find(projectRbac.getConfirmModalSelector()).length > 0) {
      projectRbac.getRoleAssignmentChangesModal().findSaveButton().click();
    }
  });

  // Wait for the modal to close and the page to return to the permissions tab
  projectRbac.findAssignRolesPage().should('not.exist');
  // Wait for the assign roles button to reappear, indicating the page has fully updated
  projectRbac.waitForAssignRolesButton();
}
