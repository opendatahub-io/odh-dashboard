import type { MLflowPrompt } from '~/app/types';

export const mockMLflowPrompt = (overrides: Partial<MLflowPrompt> = {}): MLflowPrompt => ({
  name: 'test-prompt',
  description: 'A test prompt',
  // eslint-disable-next-line camelcase
  latest_version: 1,
  tags: {},
  // eslint-disable-next-line camelcase
  creation_timestamp: '2025-06-15T10:00:00Z',
  ...overrides,
});
