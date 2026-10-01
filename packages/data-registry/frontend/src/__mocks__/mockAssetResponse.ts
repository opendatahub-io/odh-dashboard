import { StructuredAssetResponse } from '~/app/types';

/* eslint-disable camelcase */
export const mockAssetResponse = (
  overrides?: Partial<StructuredAssetResponse>,
): StructuredAssetResponse => ({
  name: 'test-table',
  asset_type: 'table',
  uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  format: 'parquet',
  storage_location: 's3://my-bucket/data/test-table/',
  columns: [
    { name: 'id', type: 'integer', nullable: false, description: 'Primary key' },
    { name: 'name', type: 'string', nullable: true, description: 'Display name' },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
  collection: 'default',
  connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
  owner: 'data-team',
  description: 'A test table for unit testing',
  labels: ['production', 'analytics'],
  properties: { 'data.quality': 'verified', source: 'etl-pipeline' },
  created_at: '2026-07-15T10:30:00Z',
  updated_at: '2026-08-20T14:45:00Z',
  ...overrides,
});
