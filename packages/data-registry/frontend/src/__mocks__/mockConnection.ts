/* eslint-disable camelcase */
import { DchConnectionRef, RhaiConnectionRef } from '~/app/types';

export const mockDchConnection = (overrides: Partial<DchConnectionRef> = {}): DchConnectionRef => ({
  type: 'dch',
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Production data',
  connectionType: 's3',
  ...overrides,
});

export const mockRhaiConnection = (
  overrides: Partial<RhaiConnectionRef> = {},
): RhaiConnectionRef => ({
  type: 'secret',
  secret_name: 'my-s3-connection',
  name: 'My S3 Connection',
  connectionType: 's3',
  ...overrides,
});
