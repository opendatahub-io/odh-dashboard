import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import {
  asDisallowedUser,
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig } from '~/__mocks__';
import { aboutDialog } from '~/__tests__/cypress/cypress/pages/aboutDialog';
import { mockConsoleLinks } from '~/__mocks__/mockConsoleLinks';
import { loginDialog } from '~/__tests__/cypress/cypress/pages/loginDialog';

describe('Application', () => {
  it('should disallow access to the dashboard', () => {
    asDisallowedUser();
    appChrome.visit();
    appChrome.shouldBeUnauthorized();
    appChrome.findNavToggle().should('not.exist');
  });

  it('should not show Settings nav section for non product admins', () => {
    asProjectAdminUser();
    appChrome.visit();
    appChrome.findNavSection('Settings').should('not.exist');
  });

  it('should show Settings nav section for cluster admins', () => {
    asProductAdminUser();
    appChrome.visit();
    appChrome.findNavSection('Settings').should('exist');
  });

  it('Validate clicking on App Launcher opens menu', () => {
    cy.interceptOdh('GET /api/console-links', mockConsoleLinks());
    appChrome.visit();
    const applicationLauncher = appChrome.getApplicationLauncher();
    applicationLauncher.toggleAppLauncherButton();

    // Have a static item
    const applicationLauncherMenuGroupStatic =
      applicationLauncher.getApplicationLauncherMenuGroup('Red Hat Applications');
    applicationLauncherMenuGroupStatic.shouldHaveApplicationLauncherItem(
      'OpenShift Cluster Manager',
    );

    // Do not have the ODH console link
    applicationLauncher
      .findApplicationLauncherMenuGroup(`OpenShift Open Data Hub`)
      .should('not.exist');

    applicationLauncher.toggleAppLauncherButton();
  });

  it('should show the about modal for ODH application', () => {
    cy.interceptOdh('GET /api/operator-subscription-status', {
      channel: 'fast',
      lastUpdated: '2024-06-25T05:36:37Z',
    });
    cy.interceptOdh('GET /api/dsci/status', {
      conditions: [],
      release: {
        name: 'test application',
        version: '1.0.1',
      },
    });

    appChrome.visit();
    aboutDialog.show();

    aboutDialog.findText().should('contain.text', 'Open Data Hub');
    aboutDialog.findProductName().should('contain.text', 'test application');
    aboutDialog.findProductVersion().should('contain.text', '1.0.1');
    aboutDialog.findChannel().should('contain.text', 'fast');
    aboutDialog.isUserAccessLevel();
    aboutDialog.findLastUpdate().should('contain.text', 'June 25, 2024');
  });

  it('should show the about modal correctly when release name is not available', () => {
    cy.interceptOdh('GET /api/operator-subscription-status', {
      channel: 'fast',
      lastUpdated: '2024-06-25T05:36:37Z',
    });
    // Handle no release name returned
    cy.interceptOdh('GET /api/dsci/status', {
      conditions: [],
      release: {
        version: '1.0.1',
      },
    });
    appChrome.visit();
    aboutDialog.show();

    aboutDialog.findProductName().should('contain.text', 'Open Data Hub');
  });

  it('should show the about modal for RHOAI application', () => {
    // Validate RHOAI about settings
    const mockConfig = mockDashboardConfig({});
    mockConfig.metadata!.namespace = 'redhat-ods-applications';
    cy.interceptOdh('GET /api/config', mockConfig);
    cy.interceptOdh('GET /api/operator-subscription-status', {
      channel: 'fast',
      lastUpdated: '2024-06-25T05:36:37Z',
    });
    cy.interceptOdh('GET /api/dsci/status', {
      conditions: [],
      release: {
        version: '1.0.1',
      },
    });

    appChrome.visit();
    aboutDialog.show();

    aboutDialog.findText().should('contain.text', 'OpenShift');
    aboutDialog.findProductName().should('contain.text', 'OpenShift AI');
  });
  it('should show the login modal when receiving a 403 status code', () => {
    // Mock the intercept to return a 403 status code
    cy.interceptOdh('GET /api/config', {
      statusCode: 403,
    }).as('getData403');

    // Set up the sign-out intercept before visiting the page
    cy.interceptOdh('GET /oauth/sign_out').as('signOut');

    // Visit the page where the request is triggered
    cy.visit('/');

    // Wait for the intercept to be triggered
    cy.wait('@getData403');

    // Verify that the login modal is displayed
    loginDialog.shouldBeOpen();

    // Simulate clicking the Log in button
    loginDialog.findLoginButton().click();

    // Wait for the sign out intercept to be triggered
    cy.wait('@signOut');
  });
});
