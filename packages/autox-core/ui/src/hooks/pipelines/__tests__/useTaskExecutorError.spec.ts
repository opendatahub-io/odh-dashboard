/* eslint-disable camelcase -- S3ListObjectsResponse uses snake_case to match BFF API */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
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

  afterEach(() => {
    // The rediscovery test swaps in fake timers; restore them for the rest.
    jest.useRealTimers();
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

  it('should not query or serve cached results when disabled after the cache is warm', async () => {
    // Regression test for the disabled-transition path: React Query serves
    // cached data for a disabled query, so a warm cache from a previously
    // selected failed step must not let a disabled hook (e.g. the user
    // switched to a successful step) run the downstream discovery chain.
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

    const { result, rerender } = renderHook(
      (enabled: boolean) =>
        useTaskExecutorError({
          namespace: 'ns',
          runId: RUN_ID,
          pipelineRun: failedRun,
          taskKey: 'documents_discovery',
          rootDir: ROOT_DIR,
          enabled,
        }),
      { wrapper: createWrapper(), initialProps: true },
    );

    // Warm the whole chain: run dir, task dir, execution dir, log download.
    await waitFor(() => expect(result.current.logText).toBe(LOG_TEXT));

    // Disable the hook with every earlier-stage listing already cached.
    rerender(false);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
    expect(result.current.logText).toBeUndefined();
    expect(result.current.logKey).toBeUndefined();
    expect(listedPaths()).toEqual([
      { namespace: 'ns', path: `${ROOT_DIR}/${RUN_ID}` },
      { namespace: 'ns', path: TASK_DIR },
      { namespace: 'ns', path: `${TASK_DIR}exec-uuid/` },
    ]);
    expect(fetchS3File).toHaveBeenCalledTimes(1);
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

  it('should suppress the log when part of the execution discovery fails', async () => {
    // The newest attempt's listing rejects while the older attempt's log is
    // discoverable. A partial discovery must degrade to "no log" instead of
    // presenting the older retry's log as the current failure.
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
          throw new Error('listing failed');
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

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.logKey).toBeUndefined();
    expect(result.current.logText).toBeUndefined();
    expect(result.current.errorMessage).toBeUndefined();
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

  it('should rediscover the executor log when it arrives after the initial empty discovery', async () => {
    // The launcher uploads the executor log as the pod exits, so it can land
    // in S3 after the run is already marked FAILED — and both products
    // disable refetch-on-window-focus, so without polling the empty
    // discovery would stand until the panel is remounted.
    jest.useFakeTimers();
    const execDir = `${TASK_DIR}exec-uuid/`;
    let logPublished = false;
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
            common_prefixes: [{ prefix: execDir }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case execDir:
          // Listing lag: the artifact is not visible on the first listing.
          return logPublished
            ? {
                common_prefixes: [],
                contents: [
                  {
                    key: `${execDir}executor-logs-0`,
                    size: 100,
                    last_modified: '2026-10-15T01:20:54Z',
                  },
                ],
                is_truncated: false,
                key_count: 1,
                max_keys: 1000,
              }
            : {
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

    // Initial discovery settles empty — the log is not in S3 yet.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logKey).toBeUndefined();

    // The artifact lands; the next rediscovery tick picks it up (no remount).
    logPublished = true;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(result.current.logText).toBe(LOG_TEXT));
  });

  it('should rediscover a retry attempt execution directory that appears after the initial discovery', async () => {
    // A retried step gets a new execution-uuid directory that shows up in S3
    // only once its artifacts start uploading. Discovery initially sees just
    // the older attempt's directory, so the task-dir listing must keep
    // re-polling within the rediscovery window — stopping at the first
    // execution directory would leave the older attempt's log standing in
    // for the current failure.
    jest.useFakeTimers();
    const olderDir = `${TASK_DIR}exec-old/`;
    const retryDir = `${TASK_DIR}exec-retry/`;
    const retryLogText = `${LOG_TEXT}retry attempt\n`;
    let retryPublished = false;
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
          return retryPublished
            ? {
                common_prefixes: [{ prefix: olderDir }, { prefix: retryDir }],
                contents: [],
                is_truncated: false,
                key_count: 2,
                max_keys: 1000,
              }
            : {
                common_prefixes: [{ prefix: olderDir }],
                contents: [],
                is_truncated: false,
                key_count: 1,
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
        case retryDir:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${retryDir}executor-logs-0`,
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
    fetchS3File.mockImplementation(async (_namespace, key) =>
      key === `${retryDir}executor-logs-0`
        ? ({ text: () => Promise.resolve(retryLogText) } as Blob)
        : ({ text: () => Promise.resolve(LOG_TEXT) } as Blob),
    );

    const { result } = runHook({
      namespace: 'ns',
      runId: RUN_ID,
      pipelineRun: failedRun,
      taskKey: 'documents_discovery',
      rootDir: ROOT_DIR,
    });

    // The older attempt's log is discovered and shown first.
    await waitFor(() => expect(result.current.logKey).toBe(`${olderDir}executor-logs-0`));

    // The retry's directory lands; the next task-dir rediscovery tick picks
    // up the newer attempt without a remount.
    retryPublished = true;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(result.current.logKey).toBe(`${retryDir}executor-logs-0`));
    expect(result.current.logText).toBe(retryLogText);
  });

  it('should restart the rediscovery window when switching directly between failed steps', async () => {
    // Switching straight from one failed step to another keeps the hook
    // enabled, so the window anchor must key on the discovery identity —
    // otherwise the second step inherits the first's already-expired
    // deadline and never polls for its late-arriving log.
    jest.useFakeTimers();
    const dirB = `${ROOT_DIR}/${RUN_ID}/vector-db-setup/`;
    const execA = `${TASK_DIR}exec-a/`;
    const execB = `${dirB}exec-b/`;
    const logBText = `${LOG_TEXT}step b\n`;
    let logBPublished = false;
    const twoFailedTasksRun: PipelineRun = {
      ...failedRun,
      run_details: {
        task_details: [
          { task_id: 'uuid-driver', display_name: 'documents-discovery-driver' },
          { task_id: 'uuid-exec-a', display_name: 'documents-discovery', state: 'FAILED' },
          { task_id: 'uuid-exec-b', display_name: 'vector-db-setup', state: 'FAILED' },
        ],
      },
    };
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: TASK_DIR }, { prefix: dirB }],
            contents: [],
            is_truncated: false,
            key_count: 2,
            max_keys: 1000,
          };
        case TASK_DIR:
          return {
            common_prefixes: [{ prefix: execA }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case dirB:
          // Step B's execution directory has not landed in S3 yet.
          return logBPublished
            ? {
                common_prefixes: [{ prefix: execB }],
                contents: [],
                is_truncated: false,
                key_count: 1,
                max_keys: 1000,
              }
            : {
                common_prefixes: [],
                contents: [],
                is_truncated: false,
                key_count: 0,
                max_keys: 1000,
              };
        case execA:
        case execB:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${options.path}executor-logs-0`,
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
    fetchS3File.mockImplementation(async (_namespace, key) =>
      key === `${execB}executor-logs-0`
        ? ({ text: () => Promise.resolve(logBText) } as Blob)
        : ({ text: () => Promise.resolve(LOG_TEXT) } as Blob),
    );

    const { result, rerender } = renderHook(
      (taskKey: string) =>
        useTaskExecutorError({
          namespace: 'ns',
          runId: RUN_ID,
          pipelineRun: twoFailedTasksRun,
          taskKey,
          rootDir: ROOT_DIR,
        }),
      { wrapper: createWrapper(), initialProps: 'documents_discovery' },
    );

    // Step A's log is discovered and shown.
    await waitFor(() => expect(result.current.logKey).toBe(`${execA}executor-logs-0`));

    // Step A's rediscovery window expires while the user stays on the step.
    act(() => {
      jest.advanceTimersByTime(150_000);
    });

    // Switch directly to failed step B — the hook never disables in between.
    rerender('vector_db_setup');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logKey).toBeUndefined();

    // B's log lands; B's own rediscovery window must still be open.
    logBPublished = true;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(result.current.logKey).toBe(`${execB}executor-logs-0`));
    expect(result.current.logText).toBe(logBText);
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

  it('should use the failed branch task directory, not a successful sibling branch', async () => {
    // S3 lists branch dirs lexicographically, so the successful sibling
    // `pattern-generation-10` directory sorts before the failed `-2` one and
    // also matches the component-name candidate. The exact-name pass must win;
    // the mock's default case throws if the sibling directory is ever listed.
    const failedDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation-2/`;
    const siblingDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation-10/`;
    const baseDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation/`;
    const branchRun: PipelineRun = {
      ...failedRun,
      run_details: {
        task_details: [
          { task_id: 'uuid-1', display_name: 'pattern-generation', state: 'SUCCEEDED' },
          { task_id: 'uuid-2', display_name: 'pattern-generation-10', state: 'SUCCEEDED' },
          { task_id: 'uuid-3', display_name: 'pattern-generation-2', state: 'FAILED' },
        ],
      },
    };
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: siblingDir }, { prefix: failedDir }, { prefix: baseDir }],
            contents: [],
            is_truncated: false,
            key_count: 3,
            max_keys: 1000,
          };
        case failedDir:
          return {
            common_prefixes: [{ prefix: `${failedDir}exec-uuid/` }],
            contents: [],
            is_truncated: false,
            key_count: 1,
            max_keys: 1000,
          };
        case `${failedDir}exec-uuid/`:
          return {
            common_prefixes: [],
            contents: [
              {
                key: `${failedDir}exec-uuid/executor-logs-0`,
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

    expect(result.current.logKey).toBe(`${failedDir}exec-uuid/executor-logs-0`);
    expect(result.current.isError).toBe(false);
  });

  it('should not fall back to a successful sibling directory when the failed task has none', async () => {
    // The failed branch task `pattern-generation-2` crashed before uploading
    // artifacts, so only its successful siblings have directories. Discovery
    // must settle with no log rather than attribute a sibling's log to the
    // failed step.
    const siblingDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation-10/`;
    const baseDir = `${ROOT_DIR}/${RUN_ID}/pattern-generation/`;
    const branchRun: PipelineRun = {
      ...failedRun,
      run_details: {
        task_details: [
          { task_id: 'uuid-1', display_name: 'pattern-generation', state: 'SUCCEEDED' },
          { task_id: 'uuid-2', display_name: 'pattern-generation-10', state: 'SUCCEEDED' },
          { task_id: 'uuid-3', display_name: 'pattern-generation-2', state: 'FAILED' },
        ],
      },
    };
    getFiles.mockImplementation(async (_path, _opts, options) => {
      switch (options.path) {
        case `${ROOT_DIR}/${RUN_ID}`:
          return {
            common_prefixes: [{ prefix: siblingDir }, { prefix: baseDir }],
            contents: [],
            is_truncated: false,
            key_count: 2,
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

    expect(result.current.logKey).toBeUndefined();
    expect(result.current.logText).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchS3File).not.toHaveBeenCalled();
    // Only the run-dir listing happened — no sibling directory was listed.
    expect(listedPaths()).toEqual([{ namespace: 'ns', path: `${ROOT_DIR}/${RUN_ID}` }]);
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
