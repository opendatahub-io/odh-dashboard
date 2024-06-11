import { mockGroupSettings } from '~/__mocks__/mockGroupConfig';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';
import { asProductAdminUser, asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';

it('Cluster settings should not be available for non product admins', () => {
  asProjectAdminUser();
  userManagement.visit(false);
  pageNotfound.findPage().should('exist');
  userManagement.findNavItem().should('not.exist');
});

describe('User Management', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh('GET /api/groups-config', mockGroupSettings());
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
    const userGroupSection = userManagement.getUserGroupSection();
    userManagement.findSubmitButton().should('be.disabled');
    userGroupSection.findChipItem('system:authenticated').should('exist');
    userGroupSection.clearMultiChipItem();
    userGroupSection.findErrorText().should('exist');
    userGroupSection.selectMultiGroup('odh-admins');
    userGroupSection.findChipItem(/^odh-admins$/).should('exist');
    userGroupSection.findMultiGroupSelectButton().click();
    userManagement.findSubmitButton().should('be.enabled');

    cy.interceptOdh('PUT /api/groups-config', mockGroupSettings()).as('saveGroupSetting');

    userManagement.findSubmitButton().click();
    cy.wait('@saveGroupSetting').then((interception) => {
      expect(interception.request.body).to.eql({
        adminGroups: [
          { id: 0, name: 'odh-admins', enabled: true },
          { id: 1, name: 'odh-admins-1', enabled: false },
        ],
        allowedGroups: [
          { id: 0, name: 'odh-admins', enabled: true },
          { id: 1, name: 'odh-admins-1', enabled: false },
          { id: 2, name: 'system:authenticated', enabled: false },
        ],
      });
    });
    userManagement.shouldHaveSuccessAlertMessage();
  });
});
