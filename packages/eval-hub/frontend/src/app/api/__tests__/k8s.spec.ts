/* eslint-disable camelcase */
import { handleRestFailures, restGET, restCREATE, isModArchResponse } from 'mod-arch-core';
import {
  getCollections,
  getEvalHubCRStatus,
  getProviders,
  createEvaluationJob,
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

describe('getCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the array directly when response data is already an array', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-1' }, name: 'Alpha' }];
    mockRestGET.mockResolvedValue({ data: collections });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual(collections);
  });

  it('should return items from the envelope when response data has an items property', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-2' }, name: 'Beta' }];
    mockRestGET.mockResolvedValue({ data: { items: collections } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual(collections);
  });

  it('should return empty array when response data items is null', async () => {
    mockRestGET.mockResolvedValue({ data: { items: null } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual([]);
  });

  it('should return empty array when response data items is undefined', async () => {
    mockRestGET.mockResolvedValue({ data: {} });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual([]);
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getCollections('', 'test-ns')({})).rejects.toThrow('Invalid response format');
  });

  it('should call restGET with the correct URL and namespace query param', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getCollections('', 'my-ns')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/collections',
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    await getCollections('http://my-host', 'ns')({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
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
