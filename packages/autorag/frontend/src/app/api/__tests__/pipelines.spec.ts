/* eslint-disable camelcase */
import { handleRestFailures, restGET } from 'mod-arch-core';
import {
  getPipelineRunsFromBFF,
  getPipelineRunFromBFF,
  getPipelineDefinitions,
} from '~/app/api/pipelines';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';

// Mock dependencies
jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn((response) => response && 'data' in response),
  asEnumMember: jest.fn(),
  DeploymentMode: { Federated: 'Federated', Standalone: 'Standalone' },
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockRestGET = jest.mocked(restGET);

describe('pipelines API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPipelineRunsFromBFF', () => {
    const mockRuns: PipelineRun[] = [
      {
        run_id: 'run-1',
        display_name: 'Test Run 1',
        state: RuntimeStateKF.SUCCEEDED,
        created_at: '2025-01-01T00:00:00Z',
        pipeline_version_reference: {
          pipeline_id: 'pipeline-1',
          pipeline_version_id: 'version-1',
        },
      },
      {
        run_id: 'run-2',
        display_name: 'Test Run 2',
        state: RuntimeStateKF.RUNNING,
        created_at: '2025-01-02T00:00:00Z',
        pipeline_version_reference: {
          pipeline_id: 'pipeline-2',
          pipeline_version_id: 'version-2',
        },
      },
    ];

    it('should fetch pipeline runs with default page size', async () => {
      const mockResponse = {
        data: {
          runs: mockRuns,
          total_size: 2,
          next_page_token: '',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getPipelineRunsFromBFF('', { namespace: 'test-namespace' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs',
        {
          namespace: 'test-namespace',
          pageSize: '20',
        },
        {},
      );
      expect(result).toEqual({
        runs: mockRuns,
        total_size: 2,
        next_page_token: '',
      });
    });

    it('should fetch pipeline runs with custom page size', async () => {
      const mockResponse = {
        data: {
          runs: [mockRuns[0]],
          total_size: 1,
          next_page_token: 'token-123',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getPipelineRunsFromBFF('', {
        namespace: 'test-namespace',
        pageSize: 10,
      });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs',
        {
          namespace: 'test-namespace',
          pageSize: '10',
        },
        {},
      );
      expect(result.runs).toHaveLength(1);
      expect(result.next_page_token).toBe('token-123');
    });

    it('should include pipelineVersionId when provided', async () => {
      const mockResponse = {
        data: {
          runs: mockRuns,
          total_size: 2,
          next_page_token: '',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getPipelineRunsFromBFF('', {
        namespace: 'test-namespace',
        pipelineVersionId: 'version-123',
      });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs',
        expect.objectContaining({
          namespace: 'test-namespace',
          pageSize: '20',
          pipelineVersionId: 'version-123',
        }),
        {},
      );
    });

    it('should include nextPageToken when provided', async () => {
      const mockResponse = {
        data: {
          runs: mockRuns,
          total_size: 2,
          next_page_token: 'next-token',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getPipelineRunsFromBFF('', {
        namespace: 'test-namespace',
        nextPageToken: 'current-token',
      });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs',
        expect.objectContaining({
          namespace: 'test-namespace',
          pageSize: '20',
          nextPageToken: 'current-token',
        }),
        {},
      );
    });

    it('should handle empty runs response', async () => {
      const mockResponse = {
        data: {
          runs: [],
          total_size: 0,
          next_page_token: '',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getPipelineRunsFromBFF('', { namespace: 'test-namespace' });

      expect(result).toEqual({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });
    });

    it('should handle missing optional fields in response', async () => {
      const mockResponse = {
        data: {},
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getPipelineRunsFromBFF('', { namespace: 'test-namespace' });

      expect(result).toEqual({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getPipelineRunsFromBFF('', { namespace: 'test-namespace' })).rejects.toThrow(
        'Invalid response format',
      );
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: {
          runs: mockRuns,
          total_size: 2,
          next_page_token: '',
        },
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getPipelineRunsFromBFF('', { namespace: 'test-namespace' }, apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs',
        expect.any(Object),
        apiOptions,
      );
    });
  });

  describe('getPipelineRunFromBFF', () => {
    const mockRun: PipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: RuntimeStateKF.SUCCEEDED,
      created_at: '2025-01-01T00:00:00Z',
      pipeline_version_reference: {
        pipeline_id: 'pipeline-1',
        pipeline_version_id: 'version-1',
      },
    };

    it('should fetch single pipeline run', async () => {
      const mockResponse = {
        data: mockRun,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getPipelineRunFromBFF('', 'run-123', 'test-namespace');

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs/run-123',
        { namespace: 'test-namespace' },
        {},
      );
      expect(result).toEqual(mockRun);
    });

    it('should URL encode run ID', async () => {
      const mockResponse = {
        data: mockRun,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getPipelineRunFromBFF('', 'run/with/slashes', 'test-namespace');

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs/run%2Fwith%2Fslashes',
        { namespace: 'test-namespace' },
        {},
      );
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getPipelineRunFromBFF('', 'run-123', 'test-namespace')).rejects.toThrow(
        'Invalid response format',
      );
    });

    it('should pass API options to restGET', async () => {
      const mockResponse = {
        data: mockRun,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const apiOptions = { signal: new AbortController().signal };
      await getPipelineRunFromBFF('', 'run-123', 'test-namespace', apiOptions);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/pipeline-runs/run-123',
        { namespace: 'test-namespace' },
        apiOptions,
      );
    });
  });

  describe('getPipelineDefinitions', () => {
    it('should return empty array for valid namespace', async () => {
      const result = await getPipelineDefinitions('', 'test-namespace');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty namespace', async () => {
      const result = await getPipelineDefinitions('', '');

      expect(result).toEqual([]);
    });

    it('should not make any API calls', async () => {
      await getPipelineDefinitions('', 'test-namespace');

      expect(mockRestGET).not.toHaveBeenCalled();
      expect(mockHandleRestFailures).not.toHaveBeenCalled();
    });
  });
});
