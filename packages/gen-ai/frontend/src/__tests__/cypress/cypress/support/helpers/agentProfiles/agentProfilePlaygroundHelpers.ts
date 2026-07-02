/* eslint-disable camelcase */
import {
  mockMLflowPromptVersion,
  mockMLflowPromptVersionsResponse,
  mockMLflowPromptsList,
  mockNamespace,
  mockNamespaces,
  mockEmptyList,
  mockStatus,
} from '~/__tests__/cypress/cypress/__mocks__';
import type { AgentProfileSummary } from '~/app/agentProfile/types';

// ---------------------------------------------------------------------------
// Base playground intercepts (no E2E MCP config required)
// ---------------------------------------------------------------------------

/**
 * Set up the minimum intercepts needed for the playground to load in mock mode.
 * Call in beforeEach for every agent profile playground test.
 */
export const setupPlaygroundBase = (namespace: string): void => {
  const namespacesData = [
    mockNamespace({ name: namespace, display_name: namespace }),
    ...mockNamespaces().data.filter((ns) => ns.name !== namespace),
  ];
  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });
  cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });
  cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } });
  cy.interceptGenAi('GET /api/v1/lsd/status', { query: { namespace } }, mockStatus('Ready'));
  // Include the model used in makeProfileResponse so validation warnings don't fire
  // and the Edit button stays enabled in tests that expect it to be clickable.
  cy.interceptGenAi(
    'GET /api/v1/lsd/models',
    { query: { namespace } },
    {
      data: [
        {
          id: 'meta-llama/llama-3.1-8b-instruct',
          providerModelId: 'meta-llama/llama-3.1-8b-instruct',
          providerId: 'meta-llama',
          modelType: 'llm',
          metadata: {},
        },
      ],
    },
  );
  cy.interceptGenAi('GET /api/v1/aaa/models', { query: { namespace } }, mockEmptyList());
  cy.interceptGenAi('GET /api/v1/maas/models', { query: { namespace } }, mockEmptyList());
  cy.interceptGenAi(
    'GET /api/v1/aaa/mcps',
    { query: { namespace } },
    { data: { servers: [], config_map_info: null, total_count: 0 } },
  );
};

// ---------------------------------------------------------------------------
// Shared mock data factories
// ---------------------------------------------------------------------------

export const makeProfileResponse = (
  profileId: string,
  displayName: string,
  overrides: Partial<{
    description: string;
    promptName: string;
    promptVersion: number;
    namespace: string;
  }> = {},
): Record<string, unknown> => ({
  data: {
    apiVersion: 'genai.redhat.com/v1alpha1',
    kind: 'AgentProfile',
    metadata: { name: `agent-profile-${profileId}`, resourceVersion: 'rv-1' },
    spec: {
      displayName,
      description: overrides.description ?? '',
      model: {
        id: 'llama-3.1-8b-instruct',
        uri: `http://llama-3.1-8b-instruct.mock-test-namespace-2.svc.cluster.local:8080`,
        sourceType: 'namespace',
      },
      temperature: 0.7,
      stream: true,
      ...(overrides.promptName && {
        prompt: {
          name: overrides.promptName,
          source: 'mlflow',
          version: String(overrides.promptVersion ?? 1),
        },
      }),
    },
  },
});

export const makeCreateProfileResponse = (
  profileId: string,
  displayName: string,
  namespace: string,
): Record<string, unknown> => ({
  data: {
    name: `agent-profile-${profileId}`,
    profileId,
    displayName,
    namespace,
    resourceVersion: 'rv-1',
  } satisfies Partial<AgentProfileSummary> & {
    name: string;
    profileId: string;
    displayName: string;
    namespace: string;
    resourceVersion: string;
  },
});

// ---------------------------------------------------------------------------
// Intercept helpers — register once per test in beforeEach
// ---------------------------------------------------------------------------

/**
 * Intercept GET + PUT for an existing agent profile.
 * Aliases: @getAgentProfile, @updateAgentProfile
 */
export const interceptExistingAgentProfile = (
  profileId: string,
  displayName: string,
  namespace: string,
  opts: { promptName?: string; promptVersion?: number } = {},
): void => {
  cy.interceptGenAi(
    'GET /api/v1/agent-profiles/*',
    makeProfileResponse(profileId, displayName, {
      ...opts,
    }),
  ).as('getAgentProfile');

  cy.interceptGenAi('PUT /api/v1/agent-profiles/*', {
    data: {
      name: `agent-profile-${profileId}`,
      profileId,
      displayName,
      namespace,
      resourceVersion: 'rv-2',
    },
  }).as('updateAgentProfile');
};

/**
 * Intercept POST (create) and GET (reload) for a new agent profile.
 * Aliases: @createAgentProfile, @getAgentProfile
 */
export const interceptNewAgentProfile = (
  profileId: string,
  displayName: string,
  namespace: string,
): void => {
  const response = makeCreateProfileResponse(profileId, displayName, namespace);
  cy.interceptGenAi('POST /api/v1/agent-profiles', response).as('createAgentProfile');
  cy.interceptGenAi('GET /api/v1/agent-profiles/*', makeProfileResponse(profileId, displayName)).as(
    'getAgentProfile',
  );
};

/**
 * Intercept MLflow prompt list-versions, get, and register (POST).
 * Aliases: @listPromptVersions, @getPrompt, @registerPrompt
 */
export const interceptMLflowPrompt = (
  promptName: string,
  template: string,
  currentVersion = 1,
): void => {
  // List all prompts — needed when the Prompt tab activates in the Settings panel
  cy.interceptGenAi('GET /api/v1/mlflow/prompts', mockMLflowPromptsList()).as('listPrompts');

  cy.intercept('GET', `**/api/v1/mlflow/prompts/${promptName}/versions**`, {
    statusCode: 200,
    body: mockMLflowPromptVersionsResponse([
      {
        version: currentVersion,
        commit_message: 'Latest',
        tags: {},
        created_at: '',
        updated_at: '',
      },
    ]),
  }).as('listPromptVersions');

  cy.intercept('GET', `**/api/v1/mlflow/prompts/${promptName}**`, (req) => {
    if (!req.url.includes('/versions')) {
      req.reply({
        statusCode: 200,
        body: {
          data: mockMLflowPromptVersion({ name: promptName, version: currentVersion, template }),
        },
      });
    }
  }).as('getPrompt');

  cy.intercept('POST', '**/api/v1/mlflow/prompts**', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        data: mockMLflowPromptVersion({
          name: req.body.name ?? promptName,
          version: currentVersion + 1,
          template: req.body.template ?? template,
        }),
      },
    });
  }).as('registerPrompt');
};

/** URL for a playground page, optionally with an agentProfileId query param. */
export const playgroundUrl = (namespace: string, agentProfileId?: string): string => {
  const base = `/gen-ai-studio/playground/${namespace}`;
  return agentProfileId ? `${base}?agentProfileId=${agentProfileId}` : base;
};
