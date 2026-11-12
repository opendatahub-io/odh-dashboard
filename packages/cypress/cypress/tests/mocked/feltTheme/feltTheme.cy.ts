import {
  mockDashboardConfig,
  type MockDashboardConfigType,
} from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel, ProjectRequestModel } from '../../../utils/models';
import { navSidebar } from '../navSidebar/navSidebar';
import { appChrome } from '../../../pages/appChrome';
import { automlExperimentsPage } from '../../../pages/automl/experimentsPage';
import { createProjectModal, projectListPage } from '../../../pages/projects';

// Felt is enabled unconditionally via the inline script in index.html. Glass
// is managed by the ThemeContext's contrast mode preference. The appearance
// switcher is a PatternFly-style masthead popover with Color scheme
// (System/Light/Dark) and Contrast mode (System/Default/Glass) toggle groups.
const FELT_CONTROL_RADIUS = '999px';

const getControlRadiusToken = (): Cypress.Chainable<string> =>
  cy.get('html').then(($html) => {
    const win = $html[0].ownerDocument.defaultView;
    return win
      ? win
          .getComputedStyle($html[0])
          .getPropertyValue('--pf-t--global--border--radius--control--default')
          .trim()
      : '';
  });

describe('Felt theme (RHAI-19115)', () => {
  const initIntercepts = (config: Partial<MockDashboardConfigType> = {}) => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s('POST', ProjectRequestModel, mockProjectK8sResource({})).as('createProject');
  };

  it('applies the Felt root class and computed Felt tokens to a list surface', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    projectListPage.shouldHaveProjects();
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-projects-list');
  });

  it('keeps Felt across a form and a modal close', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.k8sNameDescription.findDisplayNameInput().type('Felt Test Project');

    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-create-project-modal');

    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
  });

  it('persists Felt into a late-loaded federated remote after in-app navigation', () => {
    initIntercepts({ automl: true });
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
        },
      }),
    );
    cy.visitWithLogin('/projects');

    cy.get('html').should('have.class', 'pf-v6-theme-felt');

    navSidebar.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' }).click();
    automlExperimentsPage.findModuleHeaderIconContainer().should('exist');

    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-federated-automl');
  });

  it('toggles color scheme and contrast mode via the appearance switcher', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    // Open the appearance switcher
    appChrome.openAppearanceSettings();
    cy.testA11y();
    cy.screenshot('felt-theme-switcher-open');

    // Toggle dark mode via color scheme
    appChrome.findColorSchemeToggle('Dark').click();
    cy.get('html').should('have.class', 'pf-v6-theme-dark');

    // Toggle light mode
    appChrome.findColorSchemeToggle('Light').click();
    cy.get('html').should('not.have.class', 'pf-v6-theme-dark');

    // Toggle Glass via contrast mode
    appChrome.findContrastModeToggle('Glass').click();
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    // Felt stays on regardless of color scheme or contrast mode
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.testA11y();
    cy.screenshot('felt-theme-glass-on');

    // Switch to Default (solid backgrounds, no glass)
    appChrome.findContrastModeToggle('Default').click();
    cy.get('html').should('not.have.class', 'pf-v6-theme-glass');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    cy.screenshot('felt-theme-glass-off');
  });

  it('persists color scheme and contrast mode preferences across reload', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    // Set dark + glass via the switcher
    appChrome.findColorSchemeToggle('Dark').click();
    appChrome.findContrastModeToggle('Glass').click();

    // Reload and verify the preferences persisted
    cy.reload();
    projectListPage.shouldHaveProjects();
    cy.get('html').should('have.class', 'pf-v6-theme-dark');
    cy.get('html').should('have.class', 'pf-v6-theme-glass');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
  });
});
