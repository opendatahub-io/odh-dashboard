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
): { data: { prompts: MLflowPrompt[]; next_page_token?: string } } => ({
  data: {
    prompts: prompts ?? [
      mockMLflowPrompt({ name: 'summarization-prompt', description: 'Summarize content' }),
      mockMLflowPrompt({
        name: 'code-review-prompt',
        description: 'Review code',
        latest_version: 3,
      }),
      mockMLflowPrompt({
        name: 'translation-prompt',
        description: 'Translate text',
        latest_version: 2,
      }),
    ],
    next_page_token: nextPageToken,
  },
});

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
