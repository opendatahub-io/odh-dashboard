/* eslint-disable camelcase */
import { UnstructuredAssetResponse } from '~/app/types';

export const mockVolumeInfo = (
  overrides?: Partial<UnstructuredAssetResponse>,
): UnstructuredAssetResponse => ({
  name: 'test-volume',
  asset_type: 'volume',
  uuid: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
  format: 'documents',
  storage_location: 's3://my-bucket/volumes/test-volume/',
  collection: 'default',
  connection_ref: null,
  description: 'A test volume for unit testing',
  owner: 'data-team',
  created_at: '2026-07-15T10:30:00Z',
  updated_at: '2026-08-20T14:45:00Z',
  labels: ['source-docs', 'unstructured'],
  properties: { purpose: 'testing' },
  columns: null,
  ...overrides,
});
