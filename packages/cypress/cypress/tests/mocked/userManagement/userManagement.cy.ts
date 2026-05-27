import { mockAuth } from '@odh-dashboard/internal/__mocks__/mockAuth';
import { mockGroup } from '@odh-dashboard/internal/__mocks__/mockGroup';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__';
import { userManagement } from '../../../pages/userManagement';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';
import { AuthModel, GroupModel } from '../../../utils/models';

it('Cluster settings should not be available for non product admins', () => {
  asProjectAdminUser();
  userManagement.visit(false);
  pageNotfound.findPage().should('exist');
  userManagement.findNavItem().should('not.exist');
});

describe('User Management', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptK8s(AuthModel, mockAuth({}));
    cy.interceptK8sList(
      GroupModel,
      mockK8sResourceList([mockGroup({}), mockGroup({ name: 'odh-admins-1' })]),
    );
    userManagement.visit();
  });

  it('should show existing enabled groups in both sections', () => {
    const adminSection = userManagement.getAdministratorGroupSection();
    const userSection = userManagement.getUserGroupSection();

    adminSection.shouldHaveAdministratorGroupInfo();
    adminSection.findGroupRow('odh-admins').should('exist');
    userSection.findGroupRow('system:authenticated').should('exist');
  });

  it('should disable remove button when only one group remains', () => {
    const adminSection = userManagement.getAdministratorGroupSection();
    // Only 'odh-admins' is enabled in mockAuth — last group, remove must be aria-disabled
    // (isAriaDisabled sets aria-disabled="true", not the native disabled attribute)
    adminSection.findRemoveGroupButton('odh-admins').should('have.attr', 'aria-disabled', 'true');
  });

  it('should add a group to the administrator section', () => {
    const adminSection = userManagement.getAdministratorGroupSection();

    const updatedAuth = mockAuth({ adminGroups: ['odh-admins', 'odh-admins-1'] });
    cy.interceptK8s('PATCH', AuthModel, updatedAuth).as('saveAdminGroups');

    adminSection.findAddGroupButton().click();
    adminSection.findGroupNameInput().type('odh-admins-1');
    adminSection.findGroupOption('odh-admins-1').click();
    adminSection.findSaveNewGroupButton().click();

    cy.wait('@saveAdminGroups').then((interception) => {
      expect(interception.request.body).to.eql([
        { value: ['odh-admins', 'odh-admins-1'], op: 'replace', path: '/spec/adminGroups' },
        { value: ['system:authenticated'], op: 'replace', path: '/spec/allowedGroups' },
      ]);
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it('should remove a group when multiple groups exist', () => {
    // Re-mock with two admin groups so remove is not disabled
    cy.interceptK8s(AuthModel, mockAuth({ adminGroups: ['odh-admins', 'odh-admins-1'] }));
    cy.reload();
    cy.findByTestId('app-page-title').should('have.text', 'User management');

    const adminSection = userManagement.getAdministratorGroupSection();

    const updatedAuth = mockAuth({ adminGroups: ['odh-admins'] });
    cy.interceptK8s('PATCH', AuthModel, updatedAuth).as('removeAdminGroup');

    adminSection.findRemoveGroupButton('odh-admins-1').click();

    userManagement.findRemoveGroupModal().should('be.visible');
    userManagement.findModalRemoveButton().click();

    cy.wait('@removeAdminGroup').then((interception) => {
      expect(interception.request.body).to.eql([
        { value: ['odh-admins'], op: 'replace', path: '/spec/adminGroups' },
        { value: ['system:authenticated'], op: 'replace', path: '/spec/allowedGroups' },
      ]);
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it('should add a group to the user section', () => {
    const userSection = userManagement.getUserGroupSection();

    const updatedAuth = mockAuth({ allowedGroups: ['system:authenticated', 'odh-admins'] });
    cy.interceptK8s('PATCH', AuthModel, updatedAuth).as('saveUserGroups');

    userSection.findAddGroupButton().click();
    userSection.findGroupNameInput().type('odh-admins');
    userSection.findGroupOption('odh-admins').click();
    userSection.findSaveNewGroupButton().click();

    cy.wait('@saveUserGroups').then((interception) => {
      expect(interception.request.body).to.eql([
        { value: ['odh-admins'], op: 'replace', path: '/spec/adminGroups' },
        {
          value: ['system:authenticated', 'odh-admins'],
          op: 'replace',
          path: '/spec/allowedGroups',
        },
      ]);
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it('should add a custom group name not in the OCP groups list', () => {
    // Simulates BYO OIDC group names or any name typed manually that is not a known K8s group.
    // The typeahead shows 'Select "custom-oidc-group"' (create option) instead of a direct match.
    const userSection = userManagement.getUserGroupSection();

    const updatedAuth = mockAuth({ allowedGroups: ['system:authenticated', 'custom-oidc-group'] });
    cy.interceptK8s('PATCH', AuthModel, updatedAuth).as('saveCustomGroup');

    userSection.findAddGroupButton().click();
    userSection.findGroupNameInput().type('custom-oidc-group');
    // 'custom-oidc-group' is not in the K8s groups mock — dropdown shows 'Select "custom-oidc-group"'
    userSection.findGroupOption('custom-oidc-group').click();
    userSection.findSaveNewGroupButton().click();

    cy.wait('@saveCustomGroup').then((interception) => {
      expect(interception.request.body).to.eql([
        { value: ['odh-admins'], op: 'replace', path: '/spec/adminGroups' },
        {
          value: ['system:authenticated', 'custom-oidc-group'],
          op: 'replace',
          path: '/spec/allowedGroups',
        },
      ]);
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it('should prevent adding a duplicate group', () => {
    const adminSection = userManagement.getAdministratorGroupSection();

    adminSection.findAddGroupButton().click();
    adminSection.findGroupNameInput().type('odh-admins');
    adminSection.findGroupOption('odh-admins').click();

    adminSection.findDuplicateError().should('exist');
    adminSection.findSaveNewGroupButton().should('be.disabled');
  });

  it('should cancel the add group row', () => {
    const adminSection = userManagement.getAdministratorGroupSection();

    adminSection.findAddGroupButton().click();
    adminSection.findGroupNameInput().should('exist');
    adminSection.findCancelAddGroupButton().click();
    adminSection.findGroupNameInput().should('not.exist');
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/groupSettings');
    cy.findByTestId('app-page-title').contains('User management');
    cy.url().should('include', '/settings/user-management');
  });
});
