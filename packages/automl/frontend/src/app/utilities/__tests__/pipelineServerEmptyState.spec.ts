import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';

import { shouldShowConfigurePipelineServerEmptyState } from '~/app/utilities/pipelineServerEmptyState';

jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(),
}));

const mockGetGenericErrorCode = jest.mocked(getGenericErrorCode);

describe('shouldShowConfigurePipelineServerEmptyState', () => {
  beforeEach(() => {
    mockGetGenericErrorCode.mockReturnValue(undefined);
  });

  it('returns true for missing managed pipelines message with 404', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error(
          'required managed pipelines not found in namespace - enable AutoML and AutoRAG pipelines on the pipeline server',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for similar managed pipeline message with singular pipeline', () => {
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error(
          'required managed pipeline not found in namespace - enable AutoML on the pipeline server',
        ),
      ),
    ).toBe(false);
  });

  it('returns false for 404 when message does not match managed pipelines error', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('the requested resource could not be found'),
      ),
    ).toBe(false);
  });

  it('returns true for missing managed pipelines message without status code (flattened Error)', () => {
    mockGetGenericErrorCode.mockReturnValue(undefined);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error(
          'required managed pipelines not found in namespace - enable AutoML and AutoRAG pipelines on the pipeline server',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated 500 errors', () => {
    mockGetGenericErrorCode.mockReturnValue(500);
    expect(shouldShowConfigurePipelineServerEmptyState(new Error('upstream timeout'))).toBe(false);
  });

  it('returns false when status code 404 appears only in the error message', () => {
    mockGetGenericErrorCode.mockReturnValue(undefined);
    expect(
      shouldShowConfigurePipelineServerEmptyState(new Error('Request failed with status code 404')),
    ).toBe(false);
  });

  it('returns true for no Pipeline Server (DSPipelineApplication) message', () => {
    mockGetGenericErrorCode.mockReturnValue(undefined);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('no Pipeline Server (DSPipelineApplication) found in namespace'),
      ),
    ).toBe(true);
  });

  it('returns false for Pipeline Server (DSPA) is not ready (readiness, not missing server)', () => {
    mockGetGenericErrorCode.mockReturnValue(503);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('Pipeline Server (DSPA) is not ready - check APIServer'),
      ),
    ).toBe(false);
  });

  it('returns true for Pipeline Server (DSPA) with non-readiness suffix', () => {
    mockGetGenericErrorCode.mockReturnValue(500);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('Pipeline Server (DSPA) found in namespace x but API URL missing'),
      ),
    ).toBe(true);
  });
});
