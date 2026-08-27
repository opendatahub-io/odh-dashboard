/* eslint-disable camelcase -- BFF API uses snake_case */
import { handleRestFailures, restCREATE, restGET, isModArchResponse } from 'mod-arch-core';
import type { PipelineRun } from '../types';
import { createPipelinesApi } from '../pipelines';

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restCREATE: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestCREATE = jest.mocked(restCREATE);
const mockRestGET = jest.mocked(restGET);
const mockHandleRestFailures = jest.mocked(handleRestFailures);
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

const { getPipelineRunsFromBFF, getPipelineRunFromBFF, enableManagedPipelines } =
  createPipelinesApi('/test-product', 'v1');

describe('createPipelinesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((promise) => promise);
  });

  describe('getPipelineRunsFromBFF', () => {
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

    it('should call restGET with correct URL and query params, using the default page size', async () => {
      mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
      mockIsModArchResponse.mockReturnValue(true);

      await getPipelineRunsFromBFF('', { namespace: 'my-namespace' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/pipeline-runs',
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
        '/test-product/api/v1/pipeline-runs',
        expect.objectContaining({ pipelineVersionId: 'pv-123' }),
        {},
      );
    });

    it('should include page when provided, including page 0', async () => {
      mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
      mockIsModArchResponse.mockReturnValue(true);

      await getPipelineRunsFromBFF('', { namespace: 'my-ns', page: 0 });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/pipeline-runs',
        expect.objectContaining({ page: '0' }),
        {},
      );
    });

    it('should use custom pageSize when provided, overriding the configured default', async () => {
      mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
      mockIsModArchResponse.mockReturnValue(true);

      await getPipelineRunsFromBFF('', { namespace: 'my-ns', pageSize: 50 });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/pipeline-runs',
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
        '/test-product/api/v1/pipeline-runs',
        expect.any(Object),
        opts,
      );
    });

    it('should propagate errors thrown by handleRestFailures', async () => {
      mockHandleRestFailures.mockRejectedValue(new Error('Network error'));

      await expect(getPipelineRunsFromBFF('', { namespace: 'my-ns' })).rejects.toThrow(
        'Network error',
      );
    });

    it('should use the default page size when the factory is created', async () => {
      const { getPipelineRunsFromBFF: getRunsNoDefault } = createPipelinesApi(
        '/other-product',
        'v1',
      );
      mockRestGET.mockResolvedValue({ data: { runs: [], total_size: 0, next_page_token: '' } });
      mockIsModArchResponse.mockReturnValue(true);

      await getRunsNoDefault('', { namespace: 'ns' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/other-product/api/v1/pipeline-runs',
        expect.objectContaining({ pageSize: '20' }),
        {},
      );
    });
  });

  describe('getPipelineRunFromBFF', () => {
    it('should call restGET with the correct URL and namespace query param', async () => {
      mockRestGET.mockResolvedValue({ data: mockRuns[0] });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await getPipelineRunFromBFF('', 'r1', 'my-ns');

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/pipeline-runs/r1',
        { namespace: 'my-ns' },
        {},
      );
      expect(result).toEqual(mockRuns[0]);
    });

    it('should encode special characters in runId', async () => {
      mockRestGET.mockResolvedValue({ data: mockRuns[0] });
      mockIsModArchResponse.mockReturnValue(true);

      await getPipelineRunFromBFF('', 'run/with/slashes', 'ns');

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/pipeline-runs/run%2Fwith%2Fslashes',
        { namespace: 'ns' },
        {},
      );
    });

    it('should throw when response is not a valid mod-arch response', async () => {
      mockRestGET.mockResolvedValue({ invalid: 'format' });
      mockIsModArchResponse.mockReturnValue(false);

      await expect(getPipelineRunFromBFF('', 'r1', 'ns')).rejects.toThrow(
        'Invalid response format',
      );
    });
  });

  describe('enableManagedPipelines', () => {
    it('should call restCREATE with the correct URL', async () => {
      mockRestCREATE.mockResolvedValue({ data: {} });

      await enableManagedPipelines('', 'my-ns');

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/managed-pipelines/enable?namespace=my-ns',
        {},
      );
    });

    it('should encode special characters in namespace', async () => {
      mockRestCREATE.mockResolvedValue({ data: {} });

      await enableManagedPipelines('', 'ns/with/slashes');

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/managed-pipelines/enable?namespace=ns%2Fwith%2Fslashes',
        {},
      );
    });
  });

  describe('pipeline run actions', () => {
    it('should POST terminate and retry actions to encoded endpoints', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const api = createPipelinesApi('/test-product', 'v1');

      await api.terminatePipelineRun('ns/one', 'run/one');
      await api.retryPipelineRun('ns/one', 'run/one');

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        '/test-product/api/v1/pipeline-runs/run%2Fone/terminate?namespace=ns%2Fone',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/test-product/api/v1/pipeline-runs/run%2Fone/retry?namespace=ns%2Fone',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should preserve the terminate action error behavior', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: 'boom' } }),
      });

      const api = createPipelinesApi('/test-product', 'v1');

      await expect(api.terminatePipelineRun('ns', 'run-1')).rejects.toThrow(
        'Failed to terminate run (500): boom',
      );
    });

    it('should DELETE a pipeline run and preserve the server error message', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'plain text error',
      });
      const api = createPipelinesApi('/test-product', 'v1');

      await expect(api.deletePipelineRun('ns', 'run-1')).rejects.toThrow(
        'Failed to delete run (400): plain text error',
      );
    });
  });
});
