/* eslint-disable camelcase */
import {
  mockAAModel,
  mockLlamaModel,
  mockChatResponse,
  mockLsdStatus,
} from '@odh-dashboard/gen-ai/__mocks__/genAiFixtures';

export const portalModel = mockAAModel({
  model_id: 'granite-3-8b-instruct',
  model_name: 'granite-3-8b-instruct',
  display_name: 'Granite 3 8B Instruct',
  serving_runtime: 'MaaS',
  version: '1',
  description: 'Portal test model',
  endpoints: ['external:https://inference.example.test/v1'],
  model_source_type: 'maas',
  subscriptions: [
    { name: 'premium-team-sub', displayName: 'Premium Team' },
    { name: 'basic-team-sub', displayName: 'Basic Team' },
  ],
});

export const portalLlamaModel = mockLlamaModel({
  id: `maas-provider/${portalModel.model_id}`,
  owned_by: 'maas-provider',
});

export const mockPortalChatResponse = {
  data: mockChatResponse({
    id: 'portal-response',
    model: portalLlamaModel.id,
    output: [
      {
        id: 'portal-message',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Hello from the portal model' }],
      },
    ],
  }),
};

export const mockPortalLsdStatus = {
  data: mockLsdStatus({
    name: 'portal-playground',
    phase: 'Ready',
    version: '1',
    distributionConfig: { activeDistribution: 'rh', providers: [], availableDistributions: {} },
  }),
};
