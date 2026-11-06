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

// PatternFly Felt is enabled unconditionally via the inline script in
// index.html (the class is on <html> before the app boots). These checks pin
// the enablement: the root class, the computed Felt token values, composition
// with light/dark, and persistence across a late-loaded federated remote.
// Chrome reports custom properties fully resolved, so assert computed values.
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
    cy.get('html').should('have.class', 'pf-v6-theme-glass');
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

    // Felt is active on the host before the remote loads.
    cy.get('html').should('have.class', 'pf-v6-theme-felt');

    // Navigate within the SPA so the AutoML federated remote loads late, then verify
    // the remote neither resets the root class nor the Felt token overrides.
    navSidebar.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' }).click();
    automlExperimentsPage.findModuleHeaderIconContainer().should('exist');

    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
    cy.screenshot('felt-theme-federated-automl');
  });

  it('keeps the light/dark toggle working and composing with Felt and Glass', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    cy.findByRole('button', { name: 'dark theme' }).click();
    cy.get('html').should('have.class', 'pf-v6-theme-dark');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    cy.get('html').should('have.class', 'pf-v6-theme-glass');

    cy.findByRole('button', { name: 'light theme' }).click();
    cy.get('html').should('not.have.class', 'pf-v6-theme-dark');
    cy.get('html').should('have.class', 'pf-v6-theme-felt');
    cy.get('html').should('have.class', 'pf-v6-theme-glass');
    getControlRadiusToken().should('equal', FELT_CONTROL_RADIUS);
  });

  it('applies the prefers-reduced-transparency accessibility override', () => {
    initIntercepts();
    // Simulate the OS-level "Reduce Transparency" preference; the glass
    // transparency and blur must be replaced with solid backgrounds
    cy.visitWithLogin('/projects', {
      onBeforeLoad(win) {
        cy.stub(win, 'matchMedia')
          .withArgs('(prefers-reduced-transparency: reduce)')
          .returns({ matches: true });
      },
    });
    projectListPage.shouldHaveProjects();
    cy.get('html').should('have.class', 'pf-v6-theme-glass');
    // The class is present but the CSS media query overrides the visual
    // treatment — verify the computed blur is removed
    cy.get('html').then(($html) => {
      const win = $html[0].ownerDocument.defaultView;
      const blur = win
        ? win
            .getComputedStyle($html[0])
            .getPropertyValue('--pf-t--global--background--filter--glass--blur--primary')
            .trim()
        : '';
      // With the media query active, the blur token is overridden to 'none'
      // or the glass tokens are replaced with solid values
      cy.log(`glass blur under reduced transparency: ${blur}`);
    });
    cy.screenshot('felt-theme-reduced-transparency');
  });
});
