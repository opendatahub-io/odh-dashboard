import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { getK8sWebSocketResourceURL } from '~/__tests__/cypress/cypress/utils/k8s';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Send a web socket K8s resource deleted message.
       */
      wsK8sDeleted<K extends K8sResourceCommon>(
        model: K8sModelCommon,
        resource: K,
      ): Cypress.Chainable<undefined>;

      /**
       * Send a web socket K8s resource add message.
       */
      wsK8sAdded<K extends K8sResourceCommon>(
        model: K8sModelCommon,
        resource: K,
      ): Cypress.Chainable<undefined>;

      /**
       * Send a web socket K8s resource modified message.
       */
      wsK8sModified<K extends K8sResourceCommon>(
        model: K8sModelCommon,
        resource: K,
      ): Cypress.Chainable<undefined>;
    }
  }
}

Cypress.Commands.add('wsK8sDeleted', (model, resource) => {
  cy.wsSend(getK8sWebSocketResourceURL(model), { type: 'DELETED', object: resource });
});

Cypress.Commands.add('wsK8sAdded', (model, resource) => {
  cy.wsSend(getK8sWebSocketResourceURL(model), { type: 'ADDED', object: resource });
});

Cypress.Commands.add('wsK8sModified', (model, resource) => {
  cy.wsSend(getK8sWebSocketResourceURL(model), { type: 'MODIFIED', object: resource });
});
