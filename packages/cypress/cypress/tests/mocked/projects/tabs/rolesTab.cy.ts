/**
 * Tests for the Roles tab feature flag gating.
 * Verifies that the Roles tab is visible only when the roleManagement feature flag is enabled
 * and the user has SSAR access to list roles.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { ProjectModel, SelfSubjectAccessReviewModel } from '../../../../utils/models';
import { asProjectAdminUser, asProjectEditUser } from '../../../../utils/mockUsers';

const NAMESPACE = 'test-project';

const initIntercepts = ({ roleManagement = false }: { roleManagement?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      roleManagement,
    }),
  );

  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
};

describe('Roles tab feature flag gating', () => {
  describe('with roleManagement flag disabled (default)', () => {
    beforeEach(() => {
      asProjectAdminUser();
      initIntercepts({ roleManagement: false });
    });

    it('should not show the Roles tab', () => {
      cy.visit(`/projects/${NAMESPACE}?section=overview`);
      cy.findByTestId('project-roles-tab').should('not.exist');
      cy.findByRole('tab', { name: 'Roles' }).should('not.exist');
    });

    it('should redirect from /roles/create to the project page when flag is disabled', () => {
      cy.visit(`/projects/${NAMESPACE}/roles/create`);
      cy.url().should('not.include', '/roles/create');
      cy.url().should('include', `/projects/${NAMESPACE}`);
    });
  });

  describe('with roleManagement flag enabled', () => {
    beforeEach(() => {
      asProjectAdminUser();
      initIntercepts({ roleManagement: true });
    });

    it('should show the Roles tab', () => {
      cy.visit(`/projects/${NAMESPACE}?section=roles`);
      cy.findByTestId('project-roles-tab').should('exist');
    });

    it('should show the Create role button in the Roles tab', () => {
      cy.visit(`/projects/${NAMESPACE}?section=roles`);
      cy.findByTestId('create-role-button').should('exist');
    });

    it('should render the Create role page when user has permission', () => {
      cy.visit(`/projects/${NAMESPACE}/roles/create`);
      cy.findByTestId('create-role-page').should('exist');
    });
  });

  describe('with roleManagement flag enabled but user lacks create permission', () => {
    beforeEach(() => {
      asProjectEditUser();
      initIntercepts({ roleManagement: true });
      // Override SSAR to deny 'create' on 'roles'
      cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
        const { resourceAttributes } = req.body.spec;
        if (
          resourceAttributes.resource === 'roles' &&
          resourceAttributes.verb === 'create' &&
          resourceAttributes.group === 'rbac.authorization.k8s.io'
        ) {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: false,
            }),
          );
        } else {
          req.reply(
            mockSelfSubjectAccessReview({
              ...resourceAttributes,
              allowed: true,
            }),
          );
        }
      });
    });

    it('should show the Roles tab for users with list access to roles', () => {
      cy.visit(`/projects/${NAMESPACE}?section=roles`);
      cy.findByTestId('project-roles-tab').should('exist');
    });

    it('should redirect from /roles/create when user lacks create permission', () => {
      cy.visit(`/projects/${NAMESPACE}/roles/create`);
      cy.url().should('not.include', '/roles/create');
      cy.url().should('include', `/projects/${NAMESPACE}`);
      cy.url().should('include', 'section=roles');
    });
  });
});
