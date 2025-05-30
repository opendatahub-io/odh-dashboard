import { mockDscStatus } from '#~/__mocks__';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { argoAlert } from '#~/__tests__/cypress/cypress/pages/pipelines/argoAlert';

describe('Argo Alert', () => {
  it('should display Data Science Pipelines enablement failed alert', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        conditions: [
          {
            lastHeartbeatTime: '2024-04-03T19:11:09Z',
            lastTransitionTime: '2024-04-03T19:10:27Z',
            message: 'Argo Workflow CRD already exists but not deployed by this operator',
            reason: 'ArgoWorkflowExist',
            status: 'False',
            type: 'CapabilityDSPv2Argo',
          },
        ],
      }),
    );
    appChrome.visit();
    argoAlert.findAlert().should('exist');
  });
});
