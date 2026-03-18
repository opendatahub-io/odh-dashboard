/* eslint-disable camelcase -- BFF API uses snake_case */
import { handleRestFailures, restGET, isModArchResponse } from 'mod-arch-core';
import type { PipelineRun } from '~/app/types';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/automl',
  BFF_API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

const mockRuns: PipelineRun[] = [
  {
    run_id: 'r1',
    display_name: 'Run 1',
    description: 'Run desc',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
];

describe('getPipelineRunsFromBFF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return runs, total_size, and next_page_token when response is valid', async () => {
    mockRestGET.mockResolvedValue({
      data: {
        runs: mockRuns,
        total_size: 1,
        next_page_token: 'token-1',
      },
    });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getPipelineRunsFromBFF('', { namespace: 'my-ns' });

    expect(result).toEqual({
      runs: mockRuns,
      total_size: 1,
      next_page_token: 'token-1',
    });
  });

  it('should use default values when optional fields are missing', async () => {
    mockRestGET.mockResolvedValue({ data: {} });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getPipelineRunsFromBFF('', { namespace: 'my-ns' });

    expect(result).toEqual({
      runs: [],
      total_size: 0,
      next_page_token: '',
    });
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getPipelineRunsFromBFF('', { namespace: 'my-ns' })).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should call restGET with correct URL and query params', async () => {
    mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
    mockIsModArchResponse.mockReturnValue(true);

    await getPipelineRunsFromBFF('', { namespace: 'my-namespace' });

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/pipeline-runs',
      { namespace: 'my-namespace', pageSize: '20' },
      {},
    );
  });

  it('should include pipelineVersionId when provided', async () => {
    mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
    mockIsModArchResponse.mockReturnValue(true);

    await getPipelineRunsFromBFF('', {
      namespace: 'my-ns',
      pipelineVersionId: 'pv-123',
    });

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/pipeline-runs',
      expect.objectContaining({ pipelineVersionId: 'pv-123' }),
      {},
    );
  });

  it('should include nextPageToken when provided', async () => {
    mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
    mockIsModArchResponse.mockReturnValue(true);

    await getPipelineRunsFromBFF('', {
      namespace: 'my-ns',
      nextPageToken: 'page-token-xyz',
    });

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/pipeline-runs',
      expect.objectContaining({ nextPageToken: 'page-token-xyz' }),
      {},
    );
  });

  it('should use custom pageSize when provided', async () => {
    mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
    mockIsModArchResponse.mockReturnValue(true);

    await getPipelineRunsFromBFF('', {
      namespace: 'my-ns',
      pageSize: 50,
    });

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/pipeline-runs',
      expect.objectContaining({ pageSize: '50' }),
      {},
    );
  });

  it('should pass hostPath and opts to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = { signal: new AbortController().signal };
    await getPipelineRunsFromBFF('https://host.example', { namespace: 'ns' }, opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      'https://host.example',
      '/automl/api/v1/pipeline-runs',
      expect.any(Object),
      opts,
    );
  });

  it('should propagate errors thrown by handleRestFailures', async () => {
    (handleRestFailures as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(getPipelineRunsFromBFF('', { namespace: 'my-ns' })).rejects.toThrow(
      'Network error',
    );
  });
});
