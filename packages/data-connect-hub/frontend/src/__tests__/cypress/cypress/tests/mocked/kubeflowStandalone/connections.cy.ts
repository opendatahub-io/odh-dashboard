import type { Namespace } from 'mod-arch-core';
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { connectionsPage } from '~/__tests__/cypress/cypress/pages/connections';

const namespaces: Namespace[] = [
  mockNamespace({ name: 'namespace-1' }),
  mockNamespace({ name: 'namespace-2' }),
];

const initIntercepts = () => {
  cy.intercept(
    'GET',
    '/data-connect-hub/api/v1/user',
    mockModArchResponse(mockUserSettings({ userId: 'test-user' })),
  );
  cy.intercept('GET', '/data-connect-hub/api/v1/namespaces', mockModArchResponse(namespaces));
};

describe('Connections page', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should redirect to the connection types tab from the standalone entry route', () => {
    connectionsPage.visit();

    cy.location().should('deep.include', {
      pathname: '/main-view/connection-types',
      search: '?project=namespace-1',
    });
  });

  it('should switch tabs while preserving the selected project', () => {
    connectionsPage.visit();
    connectionsPage.findTab('connections').click();

    cy.location().should('deep.include', {
      pathname: '/main-view/connections',
      search: '?project=namespace-1',
    });
  });
});
