import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { getNamespaces, verifyApiResponse } from '~/__tests__/cypress/cypress/utils/apiRequests';

describe('Namespaces E2E Tests', () => {
  before(() => {
    if (!Cypress.env('MOCK')) {
      cy.getAuthToken();
    }
  });

  it(
    'should load namespaces from the cluster',
    { tags: ['@Smoke', '@GenAI', '@Namespaces', '@API'] },
    () => {
      cy.step('Enable Gen-AI feature and visit home');
      appChrome.visit();

      cy.step('Fetch namespaces from Kubernetes cluster');
      getNamespaces().then((response) => {
        verifyApiResponse(response, 200);

        const { data: namespaces } = response.body;
        expect(namespaces).to.be.an('array');
        expect(namespaces.length).to.be.at.least(1);

        cy.step(`Found ${namespaces.length} namespace(s) in cluster`);
        namespaces.forEach((ns) => {
          cy.log(`  - ${ns.name}`);
        });
      });
    },
  );
});
