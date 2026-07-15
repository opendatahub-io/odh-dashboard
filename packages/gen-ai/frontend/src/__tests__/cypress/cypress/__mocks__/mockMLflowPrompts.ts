/* eslint-disable camelcase */
import type { MLflowPrompt, MLflowPromptVersion, MLflowPromptVersionMeta } from '~/app/types';

export const mockMLflowPrompt = (overrides: Partial<MLflowPrompt> = {}): MLflowPrompt => ({
  name: 'test-prompt',
  description: 'A test prompt',
  latest_version: 1,
  tags: {},
  creation_timestamp: '2025-06-15T10:00:00Z',
  ...overrides,
});

export const mockMLflowPromptsList = (
  prompts?: MLflowPrompt[],
  nextPageToken?: string,
): { data: { prompts: MLflowPrompt[]; next_page_token?: string; total_count: number } } => {
  const promptsList = prompts ?? [
    mockMLflowPrompt({
      name: 'summarization-prompt',
      description: 'Summarize content',
      tags: { use_case: 'summarization', language: 'en' },
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
    }),
    mockMLflowPrompt({
      name: 'code-review-prompt',
      description: 'Review code for quality and best practices',
      latest_version: 3,
      tags: { use_case: 'code-review' },
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
    }),
    mockMLflowPrompt({
      name: 'translation-prompt',
      description: 'Translate text between languages',
      latest_version: 2,
      scope: { type: 'project', namespace: 'mock-tests-namespace-2' },
    }),
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
    mockMLflowPrompt({
      name: 'team-onboarding-prompt',
      description: 'Onboarding guide for new team members',
      latest_version: 3,
      tags: { use_case: 'onboarding' },
      creation_timestamp: '2025-05-10T11:00:00Z',
      scope: { type: 'global', namespace: 'shared-team-prompts' },
    }),
    mockMLflowPrompt({
      name: 'qa-testing-prompt',
      description: 'Generate QA test scenarios from requirements',
      latest_version: 1,
      tags: { use_case: 'testing', format: 'markdown' },
      creation_timestamp: '2025-06-10T15:30:00Z',
      scope: { type: 'global', namespace: 'rhoai-templates' },
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
