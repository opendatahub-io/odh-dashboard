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

  it('Administrator group setting', () => {
    const administratorGroupSection = userManagement.getAdministratorGroupSection();
    userManagement.findSubmitButton().should('be.disabled');
    administratorGroupSection.findChipItem(/^odh-admins$/).should('exist');
    administratorGroupSection.shouldHaveAdministratorGroupInfo();
    administratorGroupSection.clearMultiChipItem();
    administratorGroupSection.selectMultiGroup('odh-admins');
    administratorGroupSection.findMultiGroupInput().type('odh-admin');
    administratorGroupSection.findMultiGroupOptions('odh-admins-1').click();
    administratorGroupSection.removeChipItem('odh-admins');
    administratorGroupSection.findChipItem(/^odh-admins$/).should('not.exist');
    administratorGroupSection.removeChipItem('odh-admins-1');
    administratorGroupSection.findErrorText().should('exist');
    administratorGroupSection.findMultiGroupOptions('odh-admins').click();
    administratorGroupSection.findErrorText().should('not.exist');
    userManagement.findSubmitButton().should('be.enabled');
  });

  it('User group setting', () => {
    const existingAllowedGroup = 'system:authenticated';
    const newAllowedGroup = 'odh-admins';

    const userGroupSection = userManagement.getUserGroupSection();
    userManagement.findSubmitButton().should('be.disabled');
    userGroupSection.findChipItem(existingAllowedGroup).should('exist');
    userGroupSection.clearMultiChipItem();
    userGroupSection.findErrorText().should('exist');
    userGroupSection.selectMultiGroup(newAllowedGroup);
    userGroupSection.findChipItem(new RegExp(`^${newAllowedGroup}$`)).should('exist');
    userGroupSection.findMultiGroupSelectButton().click();
    userManagement.findSubmitButton().should('be.enabled');

    const mockedAuth = mockAuth({ allowedGroups: [newAllowedGroup] });
    cy.interceptK8s('PATCH', AuthModel, mockedAuth).as('saveGroupSetting');

    userManagement.findSubmitButton().click();
    cy.wait('@saveGroupSetting').then((interception) => {
      expect(interception.request.body).to.eql([
        { value: ['odh-admins'], op: 'replace', path: '/spec/adminGroups' },
        { value: ['odh-admins'], op: 'replace', path: '/spec/allowedGroups' },
      ]);
      expect(interception.response?.body.spec).to.eql({
        adminGroups: ['odh-admins'],
        allowedGroups: ['odh-admins'],
      });
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/groupSettings');
    cy.findByTestId('app-page-title').contains('User management');
    cy.url().should('include', '/settings/user-management');
  });
});
