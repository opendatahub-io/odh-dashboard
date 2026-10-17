/* eslint-disable camelcase -- S3ListObjectsResponse uses snake_case to match BFF API */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { S3Api } from '../../../api/s3/s3';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import type { PipelineRun } from '../../../api/pipelines/types';
import { extractExecutorLogError } from '../../../utils/executorLogError';
import { useTaskExecutorError } from '../useTaskExecutorError';

const LOG_TEXT = `[KFP Executor 2026-10-15 01:20:53,448 INFO]: COMPONENT_STATUS component=documents_discovery stage=load_benchmark state=failed
Traceback (most recent call last):
  File "x.py", line 1, in f
ai4rag.utils.data.test_data_loader.TestDataLoaderError: Incorrect or incomplete keys in test data record at index 0.
`;

const ROOT_DIR = 'documents-rag-optimization-pipeline';
const RUN_ID = 'run-1';
const TASK_DIR = `${ROOT_DIR}/${RUN_ID}/documents-discovery/`;

const mockS3Api: S3Api = {
  uploadFileToS3: jest.fn(),
  getFiles: jest.fn(),
  fetchS3File: jest.fn(),
  fetchS3Json: jest.fn(),
};

jest.mock('../../../api/s3/s3', () => ({
  ...jest.requireActual('../../../api/s3/s3'),
  createS3Api: jest.fn(() => mockS3Api),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      AutoXApiProvider,
      { apiPrefix: '/test', bffApiVersion: 'v1' },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

type ListCall = { namespace: string; path: string };

const listedPaths = (): ListCall[] =>
  jest
    .mocked(mockS3Api.getFiles)
    .mock.calls.map((call) => call[2] as ListCall)
    .filter((options): options is ListCall => Boolean(options.path));

const runHook = (options: Parameters<typeof useTaskExecutorError>[0]) =>
  renderHook(() => useTaskExecutorError(options), { wrapper: createWrapper() });

describe('useTaskExecutorError', () => {
  const getFiles = jest.mocked(mockS3Api.getFiles);
  const fetchS3File = jest.mocked(mockS3Api.fetchS3File);

  const failedRun: PipelineRun = {
    run_id: RUN_ID,
    display_name: 'test run',
    created_at: '2026-10-15T01:00:00Z',
    state: 'FAILED',
    run_details: {
      task_details: [
        { task_id: 'uuid-driver', display_name: 'documents-discovery-driver' },
        { task_id: 'uuid-exec', display_name: 'documents-discovery', state: 'FAILED' },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom's Blob lacks .text(); duck-type it like useS3FileFetchers.spec.ts does.
    fetchS3File.mockResolvedValue({ text: () => Promise.resolve(LOG_TEXT) } as Blob);
  });

  it('should not fetch when disabled', async () => {
    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
      enabled: false,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
    expect(getFiles).not.toHaveBeenCalled();
    expect(fetchS3File).not.toHaveBeenCalled();
  });

  it('should not fetch when the task cannot be resolved', async () => {
    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'no_such_component',
      rootDir: ROOT_DIR,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
    expect(getFiles).not.toHaveBeenCalled();
  });

  it('should walk the S3 path and extract the failure message', async () => {
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [
              { prefix: `${ROOT_DIR}/${RUN_ID}/vector-db-setup/` },
              { prefix: TASK_DIR },
            ],
            contents: [],
            is_truncated: false,
            key_count: 2,
            max_keys: 1000,
          };
        case TASK_DIR:
          return {
            common_prefixes: [{ prefix: `${TASK_DIR}exec-uuid/` }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case `${TASK_DIR}exec-uuid/`:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${TASK_DIR}exec-uuid/executor-logs-0`,
                size: 100,
                last_modified: '2026-10-15T01:20:54Z',
              },
            ],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        default:
          throw new Error(`unexpected path: ${options.path}`);
      }
    });

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe(extractExecutorLogError(LOG_TEXT));
    expect(result.current.logText).toBe(LOG_TEXT);
    expect(result.current.logKey).toBe(`${TASK_DIR}exec-uuid/executor-logs-0`);
    expect(result.current.isError).toBe(false);
    // Run dir, task dir, execution dir listings + one log fetch.
    expect(listedPaths()).toEqual([
      { namespace: 'ns', path: `${ROOT_DIR}/${RUN_ID}` },
      { namespace: 'ns', path: TASK_DIR },
      { namespace: 'ns', path: `${TASK_DIR}exec-uuid/` },
    ]);
    expect(fetchS3File).toHaveBeenCalledTimes(1);
  });

  it('should pick the newest executor log across execution dirs', async () => {
    const olderDir = `${TASK_DIR}exec-old/`;
    const newerDir = `${TASK_DIR}exec-new/`;
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: TASK_DIR }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case TASK_DIR:
          return {
            common_prefixes: [{ prefix: olderDir }, { prefix: newerDir }],
            contents: [],
            is_truncated: false,
            key_count: 2,
            max_keys: 1000,
          };
        case olderDir:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${olderDir}executor-logs-0`,
                size: 10,
                last_modified: '2026-10-15T01:00:00Z',
              },
            ],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case newerDir:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${newerDir}executor-logs-0`,
                size: 10,
                last_modified: '2026-10-15T02:00:00Z',
              },
            ],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        default:
          throw new Error(`unexpected path: ${options.path}`);
      }
    });

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.logKey).toBe(`${newerDir}executor-logs-0`);
  });

  it('should settle with no message and no error when the log is missing', async () => {
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: TASK_DIR }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case TASK_DIR:
          return {
            common_prefixes: [{ prefix: `${TASK_DIR}exec-uuid/` }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case `${TASK_DIR}exec-uuid/`:
          // Pod crashed before the launcher uploaded the log artifact.
          return {
            common_prefixes: [],
            contents: [],
            is_truncated: false,
            key_count: 0,
            max_keys: 1000,
          };
        default:
          throw new Error(`unexpected path: ${options.path}`);
      }
    });

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBeUndefined();
    expect(result.current.logText).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchS3File).not.toHaveBeenCalled();
  });

  it('should prefer the failed task when several match the component', async () => {
    const branchTaskDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation-2/`;
    const branchRun: PipelineRun = {
      ...failedRun,
      run_details: {
        task_details: [
          { task_id: 'uuid-1', display_name: 'pattern-generation', state: 'SUCCEEDED' },
          { task_id: 'uuid-2', display_name: 'pattern-generation-2', state: 'FAILED' },
        ],
      },
    };
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: branchTaskDir }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case branchTaskDir:
          return {
            common_prefixes: [{ prefix: `${branchTaskDir}exec-uuid/` }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case `${branchTaskDir}exec-uuid/`:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${branchTaskDir}exec-uuid/executor-logs-0`,
                size: 10,
                last_modified: '2026-10-15T01:00:00Z',
              },
            ],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        default:
          throw new Error(`unexpected path: ${options.path}`);
      }
    });

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: branchRun,
      taskKey: 'pattern_generation',
      rootDir: ROOT_DIR,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.logKey).toBe(`${branchTaskDir}exec-uuid/executor-logs-0`);
  });

  it('should surface an error when listing fails', async () => {
    getFiles.mockRejectedValue(new Error('S3 unavailable'));

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeUndefined();
  });
});
