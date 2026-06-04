import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';

const initIntercepts = ({
  globalMLflowNamespaces = [] as string[],
}: { globalMLflowNamespaces?: string[] } = {}) => {
  asClusterAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ globalMLflowNamespaces })).as(
    'getConfig',
  );
};

describe('MLflow Global Namespace API', () => {
  describe('Admin user', () => {
    it('can set a global MLflow namespace', () => {
      initIntercepts();
      cy.interceptOdh('PUT /api/mlflow-global-namespace', {
        success: true,
        globalMLflowNamespaces: ['my-mlflow-ns'],
      }).as('setGlobalNs');

      cy.visitWithLogin('/');
      cy.get('@setGlobalNs').should('not.be.null');
    });

    it('can change the global MLflow namespace', () => {
      initIntercepts({ globalMLflowNamespaces: ['old-ns'] });
      cy.interceptOdh('PUT /api/mlflow-global-namespace', {
        success: true,
        globalMLflowNamespaces: ['new-ns'],
      }).as('changeGlobalNs');

      cy.visitWithLogin('/');
      cy.get('@changeGlobalNs').should('not.be.null');
    });

    it('can clear the global MLflow namespace', () => {
      initIntercepts({ globalMLflowNamespaces: ['old-ns'] });
      cy.interceptOdh('PUT /api/mlflow-global-namespace', {
        success: true,
        globalMLflowNamespaces: [],
      }).as('clearGlobalNs');

      cy.visitWithLogin('/');
      cy.get('@clearGlobalNs').should('not.be.null');
    });

    it('receives globalMLflowNamespaces in config response', () => {
      initIntercepts({ globalMLflowNamespaces: ['test-ns'] });

      cy.visitWithLogin('/');

      cy.wait('@getConfig').then((interception) => {
        expect(interception.response?.body.spec.globalMLflowNamespaces).to.deep.equal(['test-ns']);
      });
    });

    it('receives empty globalMLflowNamespaces when not configured', () => {
      initIntercepts();

      cy.visitWithLogin('/');

      cy.wait('@getConfig').then((interception) => {
        expect(interception.response?.body.spec.globalMLflowNamespaces).to.deep.equal([]);
      });
    });
  });

  describe('Non-admin user', () => {
    it('cannot access the global namespace endpoint', () => {
      asProjectAdminUser();
      cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
      cy.interceptOdh('PUT /api/mlflow-global-namespace', {
        statusCode: 401,
        body: {
          success: false,
          globalMLflowNamespaces: [],
        },
      }).as('unauthorizedPut');

      cy.visitWithLogin('/');
      cy.get('@unauthorizedPut').should('not.be.null');
    });
  });
});
