import { mockDocs } from '#~/__mocks__/mockDocs';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { mockQuickStarts } from '#~/__mocks__/mockQuickStarts';
import { customServingRuntimesIntercept } from '#~/__tests__/cypress/cypress/tests/mocked/customServingRuntimes/customServingRuntimesUtils';
import { notebookImageSettings } from '#~/__tests__/cypress/cypress/pages/notebookImageSettings';
import {
  asProductAdminUser,
  asProjectEditUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';

describe('Home page Admin section', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());
  });
  it('should show the admin section for admins', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts();
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().scrollIntoView();
    homeAdminSection.findNotebookImageCard().should('be.visible');
    homeAdminSection.findServingRuntimeCard().should('be.visible');
    homeAdminSection.findClusterSettingCard().should('be.visible');
    homeAdminSection.findUserManagementCard().should('be.visible');
  });

  it('should hide the admin section for non-admin users', () => {
    asProjectEditUser();
    homePage.initHomeIntercepts();
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().should('not.exist');
  });

  it('should hide notebook images card when not available', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts({ disableBYONImageStream: true });
    homePage.visit();

    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.findNotebookImageCard().should('not.exist');
    homeAdminSection.find().scrollIntoView();
    homeAdminSection.findServingRuntimeCard().should('be.visible');
    homeAdminSection.findClusterSettingCard().should('be.visible');
    homeAdminSection.findUserManagementCard().should('be.visible');
  });

  it('should hide serving runtimes card when not available', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts({ disableCustomServingRuntimes: true });
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().scrollIntoView();
    homeAdminSection.findNotebookImageCard().should('be.visible');
    homeAdminSection.findServingRuntimeCard().should('not.exist');
    homeAdminSection.findClusterSettingCard().should('be.visible');
    homeAdminSection.findUserManagementCard().should('be.visible');
  });

  it('should hide cluster settings card when not available', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts({ disableClusterManager: true });
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().scrollIntoView();
    homeAdminSection.findNotebookImageCard().should('be.visible');
    homeAdminSection.findServingRuntimeCard().should('be.visible');
    homeAdminSection.findClusterSettingCard().should('not.exist');
    homeAdminSection.findUserManagementCard().should('be.visible');
  });

  it('should hide user management card when not available', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts({ disableUserManagement: true });
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().scrollIntoView();
    homeAdminSection.findNotebookImageCard().should('be.visible');
    homeAdminSection.findServingRuntimeCard().should('be.visible');
    homeAdminSection.findClusterSettingCard().should('be.visible');
    homeAdminSection.findUserManagementCard().should('not.exist');
  });

  it('should hide the admin section if all cards are hidden', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts({
      disableBYONImageStream: true,
      disableCustomServingRuntimes: true,
      disableClusterManager: true,
      disableUserManagement: true,
    });

    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.find().should('not.exist');
  });

  it('should navigate to the correct section when the title is clicked', () => {
    asProductAdminUser();
    homePage.initHomeIntercepts();
    customServingRuntimesIntercept();
    homePage.visit();
    const homeAdminSection = homePage.getHomeAdminSection();
    homeAdminSection.findNotebookImageButton().click();
    verifyRelativeURL('/workbenchImages');

    // Verify the Settings nav menu is now expanded
    notebookImageSettings.findNavItem().should('be.visible');

    homePage.returnToHome();
    homeAdminSection.findServingRuntimeButton().click();
    // homePage.findAppPageTitle().should('have.text', 'Serving runtimes');
    verifyRelativeURL('/servingRuntimes');
    homePage.returnToHome();
    homeAdminSection.findClusterSettingButton().click();
    homePage.findAppPageTitle().should('have.text', 'General settings');
    homePage.returnToHome();
    homeAdminSection.findUserManagementButton().click();
    verifyRelativeURL('/groupSettings');
  });
});
