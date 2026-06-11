import type { AgentProfileSummary } from '~/app/agentProfile/types';
import {
  mockNamespace,
  mockNamespaces,
  mockAgentProfiles,
  mockEmptyAgentProfiles,
} from '~/__tests__/cypress/cypress/__mocks__';

export interface AgentProfilesTestOptions {
  namespace?: string;
  profiles?: Partial<AgentProfileSummary>[];
  empty?: boolean;
}

export const setupAgentProfilesIntercepts = (options: AgentProfilesTestOptions = {}): void => {
  const namespace = options.namespace ?? 'test-namespace';

  const namespacesData = [
    // eslint-disable-next-line camelcase
    mockNamespace({ name: namespace, display_name: namespace }),
    ...mockNamespaces().data.filter((ns) => ns.name !== namespace),
  ];
  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });
  cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });
  cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } });
  cy.interceptGenAi('GET /api/v1/lsd/status', {
    data: { name: 'lsd', phase: 'Ready', isReady: true },
  });

  const profilesResponse = options.empty
    ? mockEmptyAgentProfiles()
    : mockAgentProfiles(options.profiles);
  cy.interceptGenAi('GET /api/v1/agent-profiles', profilesResponse).as('listAgentProfiles');

  cy.interceptGenAi('DELETE /api/v1/agent-profiles/*', null, { statusCode: 204 }).as(
    'deleteAgentProfile',
  );

  cy.interceptGenAi('GET /api/v1/agent-profiles/*', {
    data: {
      apiVersion: 'genai.redhat.com/v1alpha1',
      kind: 'AgentProfile',
      metadata: { name: 'agent-profile-test-uuid-1', resourceVersion: 'rv-1' },
      spec: {
        displayName: 'Coding assistant',
        description: 'Code review and explanation with GitHub tools',
        model: { id: 'llama-3b', uri: 'http://llama.svc/v1', sourceType: 'namespace' },
        temperature: 0.7,
        stream: true,
      },
    },
  }).as('getAgentProfile');

  cy.interceptGenAi('PUT /api/v1/agent-profiles/*', {
    data: {
      name: 'agent-profile-test-uuid-1',
      profileId: 'test-uuid-1',
      displayName: 'Updated Name',
      namespace,
      resourceVersion: 'rv-2',
    },
  }).as('updateAgentProfile');
};
