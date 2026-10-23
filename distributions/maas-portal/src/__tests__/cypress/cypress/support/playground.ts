import { portalPath } from './portal';
import {
  portalModel,
  portalLlamaModel,
  mockPortalChatResponse,
  mockPortalLsdStatus,
} from '../__mocks__/playground';

export const genAiApi = (pathname: string): string => portalPath(`/gen-ai/api/v1${pathname}`);

export const setupPlaygroundMocks = (): void => {
  cy.intercept('GET', genAiApi('/namespaces'), {
    // eslint-disable-next-line camelcase
    data: [{ name: 'portal-project', display_name: 'Portal project' }],
  });
  cy.intercept('GET', genAiApi('/aaa/models*'), { data: [portalModel] }).as('models');
  cy.intercept('GET', genAiApi('/lsd/status*'), mockPortalLsdStatus);
  cy.intercept('GET', genAiApi('/lsd/models*'), { data: [portalLlamaModel] });
  cy.intercept('GET', genAiApi('/config*'), {
    data: { isCustomLSD: false, sandboxesAvailable: false },
  });
  cy.intercept('GET', genAiApi('/nemo-guardrails/status*'), { data: null });
  cy.intercept('GET', genAiApi('/aaa/mcps*'), { data: { servers: [] } });
  cy.intercept('POST', genAiApi('/lsd/responses*'), mockPortalChatResponse).as('chat');
};
