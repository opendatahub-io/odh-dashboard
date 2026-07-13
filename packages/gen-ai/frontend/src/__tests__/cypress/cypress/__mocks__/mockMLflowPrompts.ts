/* eslint-disable camelcase */
import type { MLflowPrompt, MLflowPromptVersion, MLflowPromptVersionMeta } from '~/app/types';

export const mockMLflowPrompt = (overrides: Partial<MLflowPrompt> = {}): MLflowPrompt => ({
  name: 'test-prompt',
  description: 'A test prompt',
  latest_version: 1,
  tags: {},
  creation_timestamp: '2025-06-15T10:00:00Z',
  associatedModel: 'meta-llama/meta-llama-3.1-70b-instruct',
  ...overrides,
});

export const mockMLflowPromptsList = (
  prompts?: MLflowPrompt[],
  nextPageToken?: string,
): { data: { prompts: MLflowPrompt[]; next_page_token?: string; total_count: number } } => {
  const promptsList = prompts ?? [
    // Scenario 1: No associated model - loads directly without warning
    mockMLflowPrompt({
      name: 'no-model-prompt',
      description: 'Prompt without associated model',
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
    }),
    // Scope demonstration prompts
    mockMLflowPrompt({
      name: 'data-extraction-prompt',
      description: 'Extract structured data from documents',
      latest_version: 4,
      tags: { use_case: 'extraction', format: 'json' },
      creation_timestamp: '2025-05-20T08:30:00Z',
      scope: { type: 'project', namespace: 'my-data-science-project' },
    }),
    mockMLflowPrompt({
      name: 'starter-template-prompt',
      description: 'A global starter template for new projects',
      scope: { type: 'global', namespace: 'rhoai-templates', read_only: true },
    }),
    mockMLflowPrompt({
      name: 'safety-guidelines-prompt',
      description: 'Enforces responsible AI safety guidelines',
      latest_version: 5,
      tags: { category: 'safety', compliance: 'required' },
      creation_timestamp: '2025-04-01T14:00:00Z',
      scope: { type: 'global', namespace: 'rhoai-policies', read_only: true },
    }),
    mockMLflowPrompt({
      name: 'customer-support-prompt',
      description: 'Handle customer support inquiries',
      latest_version: 2,
      tags: { department: 'support' },
      creation_timestamp: '2025-06-01T09:00:00Z',
      scope: { type: 'global', namespace: 'shared-team-prompts', read_only: true },
    }),
    // Scenario 2: Model NOT available in playground - shows unavailable warning
    mockMLflowPrompt({
      name: 'unavailable-model-prompt',
      description: 'Prompt with unavailable model',
      latest_version: 1,
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
      associatedModel: 'openai/gpt-4-unavailable',
    }),
    // Scenario 3a: Model available but not selected - shows model switch dialog
    mockMLflowPrompt({
      name: 'llama-33-prompt',
      description: 'Llama 3.3 (available, not default)',
      latest_version: 1,
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
      associatedModel: 'meta-llama/meta-llama-3.3-70b-instruct',
    }),
    // Scenario 3b: Another available but not selected model - shows model switch dialog
    mockMLflowPrompt({
      name: 'granite-prompt',
      description: 'Granite 3.1 (available, not default)',
      latest_version: 1,
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
      associatedModel: 'ibm-granite/granite-3.1-8b-instruct',
    }),
    // Scenario 4: Model matches current selection - loads directly without warning
    // Assumes meta-llama/meta-llama-3.1-70b-instruct is the default selected model
    mockMLflowPrompt({
      name: 'current-model-prompt',
      description: 'Llama 3.1 (current selection)',
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
      associatedModel: 'meta-llama/meta-llama-3.1-70b-instruct',
    }),
  ];
  return {
    data: {
      prompts: promptsList,
      total_count: promptsList.length,
      next_page_token: nextPageToken,
    },
  };
};

export const mockMLflowPromptVersion = (
  overrides: Partial<MLflowPromptVersion> = {},
): MLflowPromptVersion => ({
  name: 'test-prompt',
  version: 1,
  template: 'You are a helpful assistant.',
  commit_message: 'Initial version',
  tags: {},
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
  associatedModel: 'meta-llama/meta-llama-3.1-70b-instruct',
  ...overrides,
});

export const mockMLflowPromptVersionMeta = (
  overrides: Partial<MLflowPromptVersionMeta> = {},
): MLflowPromptVersionMeta => ({
  version: 1,
  commit_message: 'Initial version',
  tags: {},
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
  ...overrides,
});

export const mockMLflowPromptVersionsResponse = (
  versions?: MLflowPromptVersionMeta[],
): { data: { versions: MLflowPromptVersionMeta[]; next_page_token?: string } } => ({
  data: {
    versions: versions ?? [
      mockMLflowPromptVersionMeta({ version: 2, commit_message: 'Updated instructions' }),
      mockMLflowPromptVersionMeta({ version: 1 }),
    ],
  },
});
