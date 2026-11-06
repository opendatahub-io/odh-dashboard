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
import { automlExperimentsPage } from '../../../pages/automl/experimentsPage';
import { createProjectModal, projectListPage } from '../../../pages/projects';

// Felt is enabled unconditionally via the inline script in index.html. Glass
// is managed by the ThemeContext's contrast mode preference (default: system).
// These checks pin the enablement: the root class, the computed Felt token
// values, composition with light/dark, the contrast mode switcher, and
// persistence across a late-loaded federated remote.
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

const setContrastMode = (mode: string) => {
  cy.window({ log: false }).then((win) => {
    win.localStorage.setItem('odh.dashboard.ui.contrastMode', mode);
  });
};

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

  it('keeps the light/dark toggle working and composing with Felt', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');

    cy.findByRole('button', { name: 'dark theme' }).click();
    cy.get('html').should('have.class', 'pf-v6-theme-dark');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');

    cy.findByRole('button', { name: 'light theme' }).click();
    cy.get('html').should('not.have.class', 'pf-v6-theme-dark');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
  });

  it('toggles Glass via the contrast mode switcher', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    // Open the contrast mode dropdown and select Glass
    cy.findByRole('button', { name: 'Contrast mode' }).click();
    cy.findByRole('menuitem', { name: /Glass/ }).click();
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    // Felt stays on regardless of contrast mode
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-glass-on');

    // Switch to Default (solid backgrounds, no glass)
    cy.findByRole('button', { name: 'Contrast mode' }).click();
    cy.findByRole('menuitem', { name: /Default/ }).click();
    cy.get('html').should('not.have.class', 'pf-v6-theme-glass');

    // Felt is still on
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-glass-off');
  });

  it('persists the contrast mode preference across a page reload', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');

    // Set glass via the switcher
    cy.findByRole('button', { name: 'Contrast mode' }).click();
    cy.findByRole('menuitem', { name: /Glass/ }).click();
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    // Reload and verify the preference persisted
    cy.reload();
    projectListPage.shouldHaveProjects();
    cy.get('html').should('have.class', 'pf-v6-theme-glass');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
  });
});
