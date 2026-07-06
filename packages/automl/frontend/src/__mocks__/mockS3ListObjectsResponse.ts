/* eslint-disable camelcase */
import type { S3ListObjectsResponse, S3ObjectInfo, S3CommonPrefix } from '~/app/types';

/**
 * Mock data derived from the BFF Go mock: bff/internal/integrations/s3/s3mocks/client_mock.go
 */

// Root level ----------------------------------------------------------------->

export const mockRootPrefixes = (): S3CommonPrefix[] => [
  { prefix: 'datasets/' },
  { prefix: 'results/' },
  { prefix: 'configs/' },
];

export const mockRootObjects = (): S3ObjectInfo[] => [
  {
    key: 'README.md',
    size: 2048,
    last_modified: '2026-03-01T10:00:00Z',
    etag: '"d41d8cd98f00b204e9800998ecf8427e"',
    storage_class: 'STANDARD',
  },
  {
    key: 'config.yaml',
    size: 512,
    last_modified: '2026-03-05T14:30:00Z',
    etag: '"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"',
    storage_class: 'STANDARD',
  },
];

// Datasets level ------------------------------------------------------------->

export const mockDatasetsPrefixes = (): S3CommonPrefix[] => [
  { prefix: 'datasets/train/' },
  { prefix: 'datasets/eval/' },
];

export const mockDatasetsObjects = (): S3ObjectInfo[] => [
  {
    key: 'datasets/metadata.json',
    size: 1024,
    last_modified: '2026-03-10T08:00:00Z',
    etag: '"b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7"',
    storage_class: 'STANDARD',
  },
];

// Datasets/train level ------------------------------------------------------->

export const mockDatasetsTrainObjects = (): S3ObjectInfo[] => [
  {
    key: 'datasets/train/questions.jsonl',
    size: 524288,
    last_modified: '2026-03-10T09:00:00Z',
    etag: '"c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"',
    storage_class: 'STANDARD',
  },
  {
    key: 'datasets/train/contexts.jsonl',
    size: 1048576,
    last_modified: '2026-03-10T09:05:00Z',
    etag: '"d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"',
    storage_class: 'STANDARD',
  },
  {
    key: 'datasets/train/answers.jsonl',
    size: 262144,
    last_modified: '2026-03-10T09:10:00Z',
    etag: '"e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"',
    storage_class: 'STANDARD',
  },
];

// Results level -------------------------------------------------------------->

export const mockResultsObjects = (): S3ObjectInfo[] => [
  {
    key: 'results/run-001-metrics.json',
    size: 4096,
    last_modified: '2026-03-12T16:00:00Z',
    etag: '"f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"',
    storage_class: 'STANDARD',
  },
  {
    key: 'results/run-002-metrics.json',
    size: 4096,
    last_modified: '2026-03-13T11:30:00Z',
    etag: '"a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"',
    storage_class: 'STANDARD',
  },
  {
    key: 'results/run-003-metrics.json',
    size: 8192,
    last_modified: '2026-03-14T09:45:00Z',
    etag: '"b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"',
    storage_class: 'STANDARD',
  },
  {
    key: 'results/leaderboard.csv',
    size: 2048,
    last_modified: '2026-03-15T10:00:00Z',
    etag: '"c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"',
    storage_class: 'STANDARD',
  },
];

// Response builders ---------------------------------------------------------->

export const mockS3ListObjectsResponse = (
  overrides: Partial<S3ListObjectsResponse> = {},
): S3ListObjectsResponse => ({
  common_prefixes: mockRootPrefixes(),
  contents: mockRootObjects(),
  is_truncated: false,
  key_count: 5,
  max_keys: 1000,
  delimiter: '/',
  name: 'test-bucket',
  ...overrides,
});

export const mockS3EmptyResponse = (): S3ListObjectsResponse =>
  mockS3ListObjectsResponse({
    common_prefixes: [],
    contents: [],
    key_count: 0,
  });

export const mockS3PaginatedResponse = (): S3ListObjectsResponse =>
  mockS3ListObjectsResponse({
    is_truncated: true,
    next_continuation_token: '10',
    key_count: 10,
    max_keys: 10,
  });
