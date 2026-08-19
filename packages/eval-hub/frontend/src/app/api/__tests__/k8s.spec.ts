/* eslint-disable camelcase */
import { handleRestFailures, restGET, restCREATE, isModArchResponse } from 'mod-arch-core';
import {
  getCollections,
  getEvalHubCRStatus,
  getEvaluationJob,
  getProviders,
  createEvaluationJob,
  LogFetchError,
  isLogApiUnavailable,
  isLogServerError,
  getEvaluationJobLogs,
  getEvaluationJobBenchmarkLogs,
} from '~/app/api/k8s';
import type {
  Collection,
  CreateEvaluationJobRequest,
  EvalHubCRStatus,
  EvaluationJob,
  Provider,
} from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/eval-hub',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockRestCREATE = jest.mocked(restCREATE);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
// handleRestFailures is mocked to pass through the promise — no need to assert on it directly

describe('getEvalHubCRStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the status object when response is valid', async () => {
    const status: EvalHubCRStatus = {
      name: 'evalhub-instance',
      namespace: 'test-ns',
      phase: 'Ready',
      ready: 'True',
      readyReplicas: 1,
      replicas: 1,
    };
    mockRestGET.mockResolvedValue({ data: status });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getEvalHubCRStatus('', 'test-ns')({});

    expect(result).toEqual(status);
  });

  it('should return null when the BFF returns null data', async () => {
    mockRestGET.mockResolvedValue({ data: null });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getEvalHubCRStatus('', 'test-ns')({});

    expect(result).toBeNull();
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getEvalHubCRStatus('', 'test-ns')({})).rejects.toThrow('Invalid response format');
  });

  it('should call restGET with the correct URL and namespace query param', async () => {
    mockRestGET.mockResolvedValue({ data: null });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getEvalHubCRStatus('', 'my-ns')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evalhub/status',
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: null });
    mockIsModArchResponse.mockReturnValue(true);

    await getEvalHubCRStatus('http://my-host', 'ns')({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });
});

describe('getEvaluationJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the job when response has valid results', async () => {
    const job: EvaluationJob = {
      resource: { id: 'job-1' },
      status: { state: 'completed' },
      results: { benchmarks: [{ id: 'arc_easy', metrics: {} }] },
      model: { name: 'llama-7b' },
    };
    mockRestGET.mockResolvedValue({ data: job });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getEvaluationJob('', 'test-ns', 'job-1')({});

    expect(result).toEqual(job);
  });

  it('should accept results with no benchmarks field', async () => {
    const job: EvaluationJob = {
      resource: { id: 'job-2' },
      status: { state: 'pending' },
      results: {},
      model: { name: 'llama-7b' },
    };
    mockRestGET.mockResolvedValue({ data: job });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getEvaluationJob('', 'test-ns', 'job-2')({});

    expect(result).toEqual(job);
  });

  it('should throw when results is missing from the payload', async () => {
    mockRestGET.mockResolvedValue({ data: { resource: { id: 'job-3' }, status: {}, model: {} } });
    mockIsModArchResponse.mockReturnValue(true);

    await expect(getEvaluationJob('', 'test-ns', 'job-3')({})).rejects.toThrow(
      'Invalid evaluation job: missing results',
    );
  });

  it('should throw when results.benchmarks is not an array', async () => {
    mockRestGET.mockResolvedValue({
      data: {
        resource: { id: 'job-4' },
        status: {},
        results: { benchmarks: 'not-an-array' },
        model: {},
      },
    });
    mockIsModArchResponse.mockReturnValue(true);

    await expect(getEvaluationJob('', 'test-ns', 'job-4')({})).rejects.toThrow(
      'Invalid evaluation job: results.benchmarks is not an array',
    );
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getEvaluationJob('', 'test-ns', 'job-5')({})).rejects.toThrow(
      'Invalid response format',
    );
  });
});

describe('getCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return items from object response', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-1' }, name: 'Alpha' }];
    mockRestGET.mockResolvedValue({ data: { items: collections } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'test-ns' })({});

    expect(result).toEqual({ items: collections });
  });

  it('should wrap array response in items object for backward compatibility', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-2' }, name: 'Beta' }];
    mockRestGET.mockResolvedValue({ data: collections });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'test-ns' })({});

    expect(result).toEqual({ items: collections });
  });

  it('should return empty items when response has no items', async () => {
    mockRestGET.mockResolvedValue({ data: { items: [] } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'test-ns' })({});

    expect(result).toEqual({ items: [] });
  });

  it('should coerce null items to empty array', async () => {
    mockRestGET.mockResolvedValue({ data: { items: null } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'test-ns' })({});

    expect(result).toEqual({ items: [] });
  });

  it('should return empty items when data is null', async () => {
    mockRestGET.mockResolvedValue({ data: null });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'test-ns' })({});

    expect(result).toEqual({ items: [] });
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getCollections('', { namespace: 'test-ns' })({})).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should call restGET with namespace and limit query params', async () => {
    mockRestGET.mockResolvedValue({ data: { items: [] } });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getCollections('', { namespace: 'my-ns', limit: 200 })(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/collections',
      { namespace: 'my-ns', limit: '200' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: { items: [] } });
    mockIsModArchResponse.mockReturnValue(true);

    await getCollections('http://my-host', { namespace: 'ns' })({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('should filter out collection items missing resource.id', async () => {
    const items = [
      { resource: { id: 'col-valid' }, name: 'Valid' },
      { name: 'No resource' },
      { resource: {}, name: 'No id' },
      { resource: { id: 'col-also-valid' }, name: 'Also Valid' },
    ];
    mockRestGET.mockResolvedValue({ data: { items } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'ns' })({});

    expect(result.items).toHaveLength(2);
    expect(result.items.map((c) => c.resource.id)).toEqual(['col-valid', 'col-also-valid']);
  });

  it('should filter out collection items missing name', async () => {
    const items = [{ resource: { id: 'col-1' }, name: 'Has Name' }, { resource: { id: 'col-2' } }];
    mockRestGET.mockResolvedValue({ data: { items } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'ns' })({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Has Name');
  });

  it('should filter out invalid benchmarks within valid collection items', async () => {
    const items = [
      {
        resource: { id: 'col-1' },
        name: 'Collection',
        benchmarks: [
          { id: 'bench-valid' },
          { notAnId: true },
          { id: 123 },
          { id: 'bench-also-valid', provider_id: 'prov' },
        ],
      },
    ];
    mockRestGET.mockResolvedValue({ data: { items } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'ns' })({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].benchmarks).toHaveLength(2);
    expect(result.items[0].benchmarks?.map((b) => b.id)).toEqual([
      'bench-valid',
      'bench-also-valid',
    ]);
  });

  it('should sanitize array response the same as object response', async () => {
    const items = [{ resource: { id: 'col-valid' }, name: 'Valid' }, { name: 'Missing resource' }];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', { namespace: 'ns' })({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].resource.id).toBe('col-valid');
  });
});

describe('getProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the array directly when response data is already an array', async () => {
    const providers: Provider[] = [{ resource: { id: 'prov-1' }, name: 'Provider A' }];
    mockRestGET.mockResolvedValue({ data: providers });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'test-ns')({});

    expect(result).toEqual(providers);
  });

  it('should return items from the envelope when response data has an items property', async () => {
    const providers: Provider[] = [{ resource: { id: 'prov-2' }, name: 'Provider B' }];
    mockRestGET.mockResolvedValue({ data: { items: providers } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'test-ns')({});

    expect(result).toEqual(providers);
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getProviders('', 'test-ns')({})).rejects.toThrow('Invalid response format');
  });

  it('should call restGET with the correct URL and namespace query param', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getProviders('', 'my-ns')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/providers',
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    await getProviders('http://my-host', 'ns')({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('should filter out providers missing resource.id', async () => {
    const items = [
      { resource: { id: 'prov-valid' }, name: 'Valid Provider' },
      { name: 'No resource' },
      { resource: {}, name: 'No id' },
    ];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'ns')({});

    expect(result).toHaveLength(1);
    expect(result[0].resource.id).toBe('prov-valid');
  });

  it('should filter out providers missing name', async () => {
    const items = [
      { resource: { id: 'prov-1' }, name: 'Has Name' },
      { resource: { id: 'prov-2' } },
    ];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'ns')({});

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Has Name');
  });

  it('should filter out invalid benchmarks within valid providers', async () => {
    const items = [
      {
        resource: { id: 'prov-1' },
        name: 'Provider',
        benchmarks: [
          { id: 'bench-good', name: 'Good Bench' },
          { id: 'bench-no-name' },
          { name: 'No ID' },
          { id: 'bench-also-good', name: 'Also Good' },
        ],
      },
    ];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'ns')({});

    expect(result).toHaveLength(1);
    expect(result[0].benchmarks).toHaveLength(2);
    expect(result[0].benchmarks?.map((b) => b.id)).toEqual(['bench-good', 'bench-also-good']);
  });

  it('should filter out non-string metrics from provider benchmarks', async () => {
    const items = [
      {
        resource: { id: 'prov-1' },
        name: 'Provider',
        benchmarks: [
          { id: 'bench-1', name: 'Bench', metrics: ['accuracy', 42, 'f1', null, 'bleu'] },
        ],
      },
    ];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'ns')({});

    expect(result[0].benchmarks?.[0].metrics).toEqual(['accuracy', 'f1', 'bleu']);
  });

  it('should preserve providers with no benchmarks field', async () => {
    const items = [{ resource: { id: 'prov-1' }, name: 'Plain Provider' }];
    mockRestGET.mockResolvedValue({ data: items });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'ns')({});

    expect(result).toHaveLength(1);
    expect(result[0].benchmarks).toBeUndefined();
  });
});

describe('createEvaluationJob', () => {
  const request: CreateEvaluationJobRequest = {
    name: 'test-eval',
    model: { url: 'http://localhost:8080/v1', name: 'llama-7b' },
    benchmarks: [{ id: 'arc_easy', provider_id: 'lm_harness' }],
  };

  const jobResponse: EvaluationJob = {
    resource: { id: 'job-1' },
    status: { state: 'pending' },
    results: {},
    model: { url: 'http://localhost:8080/v1', name: 'llama-7b' },
    benchmarks: [{ id: 'arc_easy', provider_id: 'lm_harness' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should call restCREATE with the request body directly (no data wrapper)', async () => {
    mockRestCREATE.mockResolvedValue({ data: jobResponse });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await createEvaluationJob('', 'my-ns', request)(opts);

    expect(mockRestCREATE).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/jobs',
      request,
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should return the unwrapped job data from the response', async () => {
    mockRestCREATE.mockResolvedValue({ data: jobResponse });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await createEvaluationJob('', 'my-ns', request)({});

    expect(result).toEqual(jobResponse);
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestCREATE.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(createEvaluationJob('', 'my-ns', request)({})).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should pass the hostPath to restCREATE', async () => {
    mockRestCREATE.mockResolvedValue({ data: jobResponse });
    mockIsModArchResponse.mockReturnValue(true);

    await createEvaluationJob('http://my-host', 'ns', request)({});

    expect(mockRestCREATE).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    );
  });
});

describe('LogFetchError', () => {
  it('should store the status code', () => {
    const error = new LogFetchError(404, 'Not Found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not Found');
    expect(error.name).toBe('LogFetchError');
  });

  it('should be an instance of Error', () => {
    const error = new LogFetchError(500, 'Server Error');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('isLogApiUnavailable', () => {
  it('should return true for a LogFetchError with status 404', () => {
    expect(isLogApiUnavailable(new LogFetchError(404, 'Not Found'))).toBe(true);
  });

  it('should return false for a LogFetchError with a non-404 status', () => {
    expect(isLogApiUnavailable(new LogFetchError(500, 'Server Error'))).toBe(false);
  });

  it('should return false for a plain Error', () => {
    expect(isLogApiUnavailable(new Error('generic'))).toBe(false);
  });
});

describe('isLogServerError', () => {
  it('should return true for a LogFetchError with status 500', () => {
    expect(isLogServerError(new LogFetchError(500, 'Internal Server Error'))).toBe(true);
  });

  it('should return true for a LogFetchError with status 502', () => {
    expect(isLogServerError(new LogFetchError(502, 'Bad Gateway'))).toBe(true);
  });

  it('should return false for a LogFetchError with a non-5xx status', () => {
    expect(isLogServerError(new LogFetchError(404, 'Not Found'))).toBe(false);
  });

  it('should return false for a plain Error', () => {
    expect(isLogServerError(new Error('generic'))).toBe(false);
  });
});

describe('getEvaluationJobLogs', () => {
  const mockFetch = jest.fn();
  const textPlainHeaders = { get: () => 'text/plain' };
  const textPlainCharsetHeaders = { get: () => 'text/plain; charset=utf-8' };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should fetch logs and return text on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve('log line 1\nlog line 2'),
    });

    const result = await getEvaluationJobLogs('', 'test-ns', 'job-1')();

    expect(result).toBe('log line 1\nlog line 2');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/evaluations/jobs/job-1/logs?'),
      expect.objectContaining({}),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('namespace=test-ns'),
      expect.objectContaining({}),
    );
  });

  it('should forward AbortSignal to fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve('log output'),
    });

    await getEvaluationJobLogs('', 'ns', 'j1')(controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('should accept text/plain with charset parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainCharsetHeaders,
      text: () => Promise.resolve('log output'),
    });

    const result = await getEvaluationJobLogs('', 'ns', 'j1')();

    expect(result).toBe('log output');
  });

  it('should throw LogFetchError when Content-Type is not text/plain', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    });

    await expect(getEvaluationJobLogs('', 'ns', 'j1')()).rejects.toThrow(LogFetchError);
    await expect(getEvaluationJobLogs('', 'ns', 'j1')()).rejects.toThrow(
      'Unexpected Content-Type: application/json',
    );
  });

  it('should throw LogFetchError when Content-Type header is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve(''),
    });

    await expect(getEvaluationJobLogs('', 'ns', 'j1')()).rejects.toThrow(
      'Unexpected Content-Type: missing',
    );
  });

  it('should include tail_lines param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobLogs('', 'ns', 'j1', { tail_lines: 100 })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('tail_lines=100'),
      expect.objectContaining({}),
    );
  });

  it('should include timestamps param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobLogs('', 'ns', 'j1', { timestamps: true })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('timestamps=true'),
      expect.objectContaining({}),
    );
  });

  it('should include since_seconds param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobLogs('', 'ns', 'j1', { since_seconds: 300 })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('since_seconds=300'),
      expect.objectContaining({}),
    );
  });

  it('should throw LogFetchError on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(getEvaluationJobLogs('', 'ns', 'j1')()).rejects.toThrow(LogFetchError);
    await expect(getEvaluationJobLogs('', 'ns', 'j1')()).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('should throw LogFetchError with 404 when log API is unavailable', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const error = await getEvaluationJobLogs('', 'ns', 'j1')().catch((e: Error) => e);
    expect(error).toBeInstanceOf(LogFetchError);
    expect(isLogApiUnavailable(error as Error)).toBe(true);
  });

  it('should encode the jobId in the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobLogs('', 'ns', 'job/with special')();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('job%2Fwith%20special'),
      expect.objectContaining({}),
    );
  });

  it('should prepend hostPath to the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobLogs('http://my-host', 'ns', 'j1')();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/my-host/),
      expect.objectContaining({}),
    );
  });
});

describe('getEvaluationJobBenchmarkLogs', () => {
  const mockFetch = jest.fn();
  const textPlainHeaders = { get: () => 'text/plain' };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should fetch benchmark-specific logs and return text', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve('benchmark log output'),
    });

    const result = await getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 2)();

    expect(result).toBe('benchmark log output');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/evaluations/jobs/j1/benchmarks/2/logs?'),
      expect.objectContaining({}),
    );
  });

  it('should accept text/plain with charset parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain; charset=utf-8' },
      text: () => Promise.resolve('output'),
    });

    const result = await getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0)();

    expect(result).toBe('output');
  });

  it('should throw LogFetchError when Content-Type is not text/plain', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{}'),
    });

    await expect(getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0)()).rejects.toThrow(
      'Unexpected Content-Type: application/json',
    );
  });

  it('should throw LogFetchError when Content-Type header is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve(''),
    });

    await expect(getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0)()).rejects.toThrow(
      'Unexpected Content-Type: missing',
    );
  });

  it('should include tail_lines param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0, { tail_lines: 50 })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('tail_lines=50'),
      expect.objectContaining({}),
    );
  });

  it('should include timestamps param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0, { timestamps: true })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('timestamps=true'),
      expect.objectContaining({}),
    );
  });

  it('should include since_seconds param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: textPlainHeaders,
      text: () => Promise.resolve(''),
    });

    await getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0, { since_seconds: 300 })();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('since_seconds=300'),
      expect.objectContaining({}),
    );
  });

  it('should throw LogFetchError on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(getEvaluationJobBenchmarkLogs('', 'ns', 'j1', 0)()).rejects.toThrow(LogFetchError);
  });
});
