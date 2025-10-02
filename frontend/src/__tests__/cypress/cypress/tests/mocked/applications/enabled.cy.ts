import type { RoleBindingSubject } from '#~/k8sTypes';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { jupyterCard } from '#~/__tests__/cypress/cypress/pages/components/JupyterCard';
import { mockDashboardConfig, mockK8sResourceList } from '#~/__mocks__';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';

describe('Enabled Page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
  });

  it('check jupyter card details', () => {
    enabledPage.visit();
    jupyterCard.findBrandImage().should('be.visible');
    jupyterCard.findCardTitle().should('have.text', 'Start basic workbench');
    jupyterCard.findTooltipInfo().should('exist');
    jupyterCard.findPartnerBadge().should('have.text', 'Red Hat managed');
    jupyterCard
      .findPartnerBadgeDescription()
      .should(
        'have.text',
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      );
  });
  it('should navigate to the notebook controller spawner page', () => {
    const groupSubjects: RoleBindingSubject[] = [
      {
        kind: 'Group',
        apiGroup: 'rbac.authorization.k8s.io',
        name: 'group-1',
      },
    ];
    cy.interceptOdh(
      'GET /api/rolebindings/opendatahub/openshift-ai-notebooks-image-pullers',
      mockK8sResourceList([
        mockRoleBindingK8sResource({
          name: 'group-1',
          subjects: groupSubjects,
          roleRefName: 'edit',
        }),
      ]),
    );

    enabledPage.visit();
    jupyterCard.findApplicationLink().click();
    cy.findByTestId('app-page-title').should('have.text', 'Start a basic workbench');

    // Now validate with the home page feature flag enabled
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableHome: false }));

    enabledPage.visit();
    jupyterCard.findApplicationLink().click();
    cy.findByTestId('app-page-title').should('have.text', 'Start a basic workbench');
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/enabled');
    enabledPage.shouldHaveEnabledPageSection();
    cy.url().should('include', '/applications/enabled');
  });
});
