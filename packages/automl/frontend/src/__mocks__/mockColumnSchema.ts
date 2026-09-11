/* eslint-disable camelcase */
import type { ColumnSchema } from '~/app/hooks/queries';

export const mockColumnSchema = (overrides: Partial<ColumnSchema> = {}): ColumnSchema => ({
  name: 'approval_status',
  type: 'string',
  task_type: 'binary',
  unique_count: 2,
  ...overrides,
});
