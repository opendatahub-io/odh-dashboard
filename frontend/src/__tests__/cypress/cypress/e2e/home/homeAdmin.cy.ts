import { initHomeIntercepts } from '~/__tests__/cypress/cypress/e2e/home/homeUtils';
import { mockDocs } from '~/__mocks__/mockDocs';
import { mockComponents } from '~/__mocks__/mockComponents';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';
import { customServingRuntimesIntercept } from '~/__tests__/cypress/cypress/e2e/customServingRuntimes/customServingRuntimesUtils';
import { notebookImageSettings } from '~/__tests__/cypress/cypress/pages/notebookImageSettings';
import { asProductAdminUser, asProjectEditUser } from '~/__tests__/cypress/cypress/utils/users';

describe('Home page Admin section', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());
  });
  it('should show the admin section for admins', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false });

    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();
    cy.findByTestId('landing-page-admin--notebook-images').should('be.visible');
    cy.findByTestId('landing-page-admin--serving-runtimes').should('be.visible');
    cy.findByTestId('landing-page-admin--cluster-settings').should('be.visible');
    cy.findByTestId('landing-page-admin--user-management').should('be.visible');
  });
  it('should hide the admin section for non-admin users', () => {
    initHomeIntercepts({ disableHome: false });
    asProjectEditUser();
    cy.visit('/');

    cy.findByTestId('landing-page-admin').should('not.exist');
  });
  it('should hide notebook images card when not available', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false, disableBYONImageStream: true });
    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();
    cy.findByTestId('landing-page-admin--notebook-images').should('not.exist');
    cy.findByTestId('landing-page-admin--serving-runtimes').should('be.visible');
    cy.findByTestId('landing-page-admin--cluster-settings').should('be.visible');
    cy.findByTestId('landing-page-admin--user-management').should('be.visible');
  });
  it('should hide serving runtimes card when not available', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false, disableCustomServingRuntimes: true });
    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();
    cy.findByTestId('landing-page-admin--notebook-images').should('be.visible');
    cy.findByTestId('landing-page-admin--serving-runtimes').should('not.exist');
    cy.findByTestId('landing-page-admin--cluster-settings').should('be.visible');
    cy.findByTestId('landing-page-admin--user-management').should('be.visible');
  });
  it('should hide cluster settings card when not available', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false, disableClusterManager: true });
    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();
    cy.findByTestId('landing-page-admin--notebook-images').should('be.visible');
    cy.findByTestId('landing-page-admin--serving-runtimes').should('be.visible');
    cy.findByTestId('landing-page-admin--cluster-settings').should('not.exist');
    cy.findByTestId('landing-page-admin--user-management').should('be.visible');
  });
  it('should hide user management card when not available', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false, disableUserManagement: true });
    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();
    cy.findByTestId('landing-page-admin--notebook-images').should('be.visible');
    cy.findByTestId('landing-page-admin--serving-runtimes').should('be.visible');
    cy.findByTestId('landing-page-admin--cluster-settings').should('be.visible');
    cy.findByTestId('landing-page-admin--user-management').should('not.exist');
  });
  it('should hide the admin section if all cards are hidden', () => {
    asProductAdminUser();
    initHomeIntercepts({
      disableHome: false,
      disableBYONImageStream: true,
      disableCustomServingRuntimes: true,
      disableClusterManager: true,
      disableUserManagement: true,
    });

    cy.visit('/');

    cy.get('#dashboard-page-main').find('[class="pf-v5-c-drawer__content"]').scrollTo('bottom');
    cy.findByTestId('landing-page-admin').should('not.exist');
  });
  it('should navigate to the correct section when the title is clicked', () => {
    asProductAdminUser();
    initHomeIntercepts({ disableHome: false });
    customServingRuntimesIntercept();
    cy.visit('/');

    cy.findByTestId('landing-page-admin').scrollIntoView();

    cy.findByTestId('landing-page-admin--notebook-images-button').click();
    cy.findByTestId('app-page-title').should('have.text', 'Notebook images');

    // Verify the Settings nav menu is now expanded
    notebookImageSettings.findNavItem().should('be.visible');

    cy.visit('/');
    cy.findByTestId('landing-page-admin--serving-runtimes-button').click();
    cy.findByTestId('app-page-title').should('have.text', 'Serving runtimes');

    cy.visit('/');
    cy.findByTestId('landing-page-admin--cluster-settings-button').click();
    cy.findByTestId('app-page-title').should('have.text', 'Cluster settings');

    cy.visit('/');
    cy.findByTestId('landing-page-admin--user-management-button').click();
    cy.findByTestId('app-page-title').should('have.text', 'User management');
  });
});
