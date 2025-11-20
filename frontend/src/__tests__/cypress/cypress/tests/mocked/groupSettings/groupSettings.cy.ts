import { mockDashboardConfig, mockK8sResourceList, mock404Error } from '#~/__mocks__';
import { mockGroup } from '#~/__mocks__/mockGroup';
import { mockAuth } from '#~/__mocks__/mockAuth';
import { groupSettingsPage } from '#~/__tests__/cypress/cypress/pages/groupSettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { GroupModel, AuthModel } from '#~/__tests__/cypress/cypress/utils/models';

it('Group settings should not be available for non-admin users', () => {
  asProjectAdminUser();
  cy.visitWithLogin('/settings/groupSettings');
  pageNotfound.findPage().should('exist');
  groupSettingsPage.findNavItem().should('not.exist');
});

describe('Group Settings', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
    cy.interceptK8sList(
      { model: GroupModel },
      mockK8sResourceList([
        mockGroup({ name: 'odh-admins' }),
        mockGroup({ name: 'odh-users' }),
        mockGroup({ name: 'system:authenticated' }),
      ]),
    );
    cy.interceptK8s(AuthModel, mockAuth({}));
  });

  it('should display group settings page', () => {
    groupSettingsPage.visit();

    groupSettingsPage.findAdminGroupsSection().should('exist');
    groupSettingsPage.findUserGroupsSection().should('exist');
    groupSettingsPage.findSaveButton().should('be.disabled');
  });

  it('should show administrator info alert', () => {
    groupSettingsPage.visit();

    groupSettingsPage
      .findAdminGroupsAlert()
      .should('contain', 'All cluster admins are automatically assigned');
  });

  it('should enable save button when admin groups change', () => {
    groupSettingsPage.visit();

    // Initially disabled
    groupSettingsPage.findSaveButton().should('be.disabled');

    // Select an admin group
    groupSettingsPage.findAdminGroupsSelect().click();
    cy.findByRole('option', { name: 'odh-admins' }).click();

    // Save button should be enabled after change
    groupSettingsPage.findSaveButton().should('be.enabled');
  });

  it('should enable save button when user groups change', () => {
    groupSettingsPage.visit();

    groupSettingsPage.findSaveButton().should('be.disabled');

    // Select a user group
    groupSettingsPage.findUserGroupsSelect().click();
    cy.findByRole('option', { name: 'odh-users' }).click();

    groupSettingsPage.findSaveButton().should('be.enabled');
  });

  it('should save group settings successfully', () => {
    cy.interceptK8s(
      'PATCH',
      AuthModel,
      mockAuth({
        adminGroups: ['odh-admins'],
        allowedGroups: ['system:authenticated'],
      }),
    ).as('patchAuth');

    groupSettingsPage.visit();

    // Make changes to admin groups
    groupSettingsPage.findAdminGroupsSelect().click();
    cy.findByRole('option', { name: 'odh-admins' }).click();

    // Save changes
    groupSettingsPage.findSaveButton().should('be.enabled').click();

    // Wait for save to complete
    cy.wait('@patchAuth').then((interception) => {
      const { patches } = interception.request.body;
      expect(interception.request.body).to.have.property('patches');
      expect(patches).to.be.an('array');
    });

    // Verify success notification
    cy.findByText('Group settings changes saved').should('exist');

    // Save button should be disabled after save
    groupSettingsPage.findSaveButton().should('be.disabled');
  });

  it('should prevent saving with empty admin groups', () => {
    groupSettingsPage.visit();

    // Try to clear all admin groups (if any are selected)
    groupSettingsPage.findAdminGroupsSelect().click();

    // Should show validation message
    cy.findByText('One or more group must be selected').should('exist');

    // Save button should remain disabled
    groupSettingsPage.findSaveButton().should('be.disabled');
  });

  it('should prevent saving with empty user groups', () => {
    groupSettingsPage.visit();

    // User groups section should require at least one group
    groupSettingsPage.findUserGroupsSelect().click();

    // Should show validation message
    cy.findByText('One or more group must be selected').should('exist');

    groupSettingsPage.findSaveButton().should('be.disabled');
  });

  it('should allow creating new admin group', () => {
    groupSettingsPage.visit();

    // Click admin groups select
    groupSettingsPage.findAdminGroupsSelect().click();

    // Type new group name
    cy.findByRole('combobox').type('new-admin-group');

    // Should show create option
    cy.findByText(/Define new group: "new-admin-group"/).should('exist');

    // Select the create option
    cy.findByText(/Define new group: "new-admin-group"/).click();

    // Save button should be enabled
    groupSettingsPage.findSaveButton().should('be.enabled');
  });

  it('should allow creating new user group', () => {
    groupSettingsPage.visit();

    // Click user groups select
    groupSettingsPage.findUserGroupsSelect().click();

    // Type new group name
    cy.findByRole('combobox').type('new-user-group');

    // Should show create option
    cy.findByText(/Define new group: "new-user-group"/).should('exist');

    // Select the create option
    cy.findByText(/Define new group: "new-user-group"/).click();

    // Save button should be enabled
    groupSettingsPage.findSaveButton().should('be.enabled');
  });

  it('should handle save error', () => {
    cy.interceptK8s('PATCH', AuthModel, { statusCode: 500 }).as('patchAuthError');

    groupSettingsPage.visit();

    // Make a change
    groupSettingsPage.findAdminGroupsSelect().click();
    cy.findByRole('option', { name: 'odh-admins' }).click();

    // Try to save
    groupSettingsPage.findSaveButton().click();

    cy.wait('@patchAuthError');

    // Should show error notification (handled by useNotification)
    // The page should still be functional
    groupSettingsPage.findSaveButton().should('exist');
  });

  it('should handle loading error', () => {
    cy.interceptK8sList({ model: GroupModel }, mockK8sResourceList([]));
    cy.interceptK8s(AuthModel, mock404Error({ message: 'Failed to fetch auth config' }));

    groupSettingsPage.visit();

    // Should show error message
    groupSettingsPage.shouldShowError();
  });

  it('should display existing group selections', () => {
    cy.interceptK8s(
      AuthModel,
      mockAuth({
        adminGroups: ['odh-admins'],
        allowedGroups: ['odh-users', 'system:authenticated'],
      }),
    );

    groupSettingsPage.visit();

    // Should show selected admin groups
    groupSettingsPage.findAdminGroupsSection().should('contain', 'odh-admins');

    // Should show selected user groups
    groupSettingsPage.findUserGroupsSection().should('contain', 'odh-users');
    groupSettingsPage.findUserGroupsSection().should('contain', 'system:authenticated');
  });

  it('should show helper text for both sections', () => {
    groupSettingsPage.visit();

    // Check admin groups helper text
    groupSettingsPage
      .findAdminGroupsSection()
      .should('contain', 'Select from existing groups, or specify a new group name');

    // Check user groups helper text
    groupSettingsPage
      .findUserGroupsSection()
      .should('contain', 'Select from existing groups, or specify a new group name');
  });

  it('should disable save button while saving', () => {
    cy.interceptK8s('PATCH', AuthModel, (req) => {
      // Delay response to test loading state
      req.reply({
        delay: 1000,
        statusCode: 200,
        body: mockAuth({}),
      });
    }).as('patchAuthSlow');

    groupSettingsPage.visit();

    // Make a change
    groupSettingsPage.findAdminGroupsSelect().click();
    cy.findByRole('option', { name: 'odh-admins' }).click();

    // Click save
    groupSettingsPage.findSaveButton().click();

    // Button should show loading state
    groupSettingsPage.findSaveButton().should('be.disabled');
    groupSettingsPage.findSaveButton().should('have.attr', 'aria-disabled', 'true');

    cy.wait('@patchAuthSlow');

    // After save completes, button should be disabled (no changes)
    groupSettingsPage.findSaveButton().should('be.disabled');
  });
});
