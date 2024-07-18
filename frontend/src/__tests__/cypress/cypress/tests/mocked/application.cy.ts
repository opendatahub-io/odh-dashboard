import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import {
  asDisallowedUser,
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig } from '~/__mocks__';
import { aboutDialog } from '~/__tests__/cypress/cypress/pages/aboutDialog';

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
    appChrome.visit();
    const applicationLauncher = appChrome.getApplicationLauncher();
    applicationLauncher.toggleAppLauncherButton();
    const applicationLauncherMenuGroup = applicationLauncher.getApplicationLauncherMenuGroup(
      `${Cypress.env('ODH_PRODUCT_NAME')} Applications`,
    );
    applicationLauncherMenuGroup.shouldHaveApplicationLauncherItem('OpenShift Cluster Manager');
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
});
