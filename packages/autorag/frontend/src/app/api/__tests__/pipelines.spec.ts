import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { createIndexingPipelineRun } from '~/app/api/pipelines';
import type { CreateIndexingPipelineRunRequest } from '~/app/types';

/* eslint-disable camelcase -- API response fields use snake_case. */

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/autorag',
  BFF_API_VERSION: 'v1',
}));

jest.mock('@odh-dashboard/autox-core/ui/api', () => ({
  createPipelinesApi: jest.fn(() => ({
    getPipelineRunsFromBFF: jest.fn(),
    getPipelineRunFromBFF: jest.fn(),
    enableManagedPipelines: jest.fn(),
  })),
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  isModArchResponse: jest.fn(),
  restCREATE: jest.fn(),
  restGET: jest.fn(),
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
const mockRestCREATE = jest.mocked(restCREATE);

const validRun = {
  run_id: 'run-123',
  display_name: 'Index documents',
  created_at: '2026-08-26T00:00:00Z',
  state: '',
  extra_payload: 'preserved',
};
const payload: CreateIndexingPipelineRunRequest = {
  display_name: 'Index documents',
  parameters: {},
};

describe('createIndexingPipelineRun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((request) => request as never);
    mockRestCREATE.mockReturnValue(Promise.resolve({ data: validRun }) as never);
    mockIsModArchResponse.mockReturnValue(true);
  });

  it('should validate and preserve the BFF response payload', async () => {
    await expect(createIndexingPipelineRun('', 'test-namespace', payload)).resolves.toEqual(
      validRun,
    );
  });

  it('should reject a response missing required fields', async () => {
    mockRestCREATE.mockReturnValue(
      Promise.resolve({ data: { display_name: 'Index documents' } }) as never,
    );

    await expect(createIndexingPipelineRun('', 'test-namespace', payload)).rejects.toThrow();
  });
});

/* eslint-enable camelcase */
