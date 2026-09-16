import { VolumeInfo } from '~/app/types';

export const mockVolumeInfo = (overrides?: Partial<VolumeInfo>): VolumeInfo => ({
  name: 'test-volume',
  'catalog-name': 'my-project',
  'schema-name': 'default',
  'volume-type': 'EXTERNAL',
  'storage-location': 's3://my-bucket/volumes/test-volume/',
  comment: 'A test volume for unit testing',
  owner: 'data-team',
  'created-at': '2026-07-15T10:30:00Z',
  'updated-at': '2026-08-20T14:45:00Z',
  labels: ['source-docs', 'unstructured'],
  properties: { purpose: 'testing' },
  ...overrides,
});
