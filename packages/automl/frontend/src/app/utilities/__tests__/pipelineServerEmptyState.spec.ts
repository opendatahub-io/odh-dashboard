import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';

import {
  shouldShowConfigurePipelineServerEmptyState,
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
} from '~/app/utilities/pipelineServerEmptyState';

jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(),
}));

const mockGetGenericErrorCode = jest.mocked(getGenericErrorCode);

describe('shouldShowNoDSPAEmptyState', () => {
  it('returns true for no Pipeline Server (DSPipelineApplication) message', () => {
    expect(
      shouldShowNoDSPAEmptyState(
        new Error('no Pipeline Server (DSPipelineApplication) found in namespace'),
      ),
    ).toBe(true);
  });

  it('returns true for Pipeline Server (DSPA) with non-readiness suffix', () => {
    expect(
      shouldShowNoDSPAEmptyState(
        new Error('Pipeline Server (DSPA) found in namespace x but API URL missing'),
      ),
    ).toBe(true);
  });

  it('returns false for Pipeline Server (DSPA) is not ready', () => {
    expect(
      shouldShowNoDSPAEmptyState(
        new Error('Pipeline Server (DSPA) is not ready - check APIServer'),
      ),
    ).toBe(false);
  });

  it('returns false for managed pipelines missing message', () => {
    expect(
      shouldShowNoDSPAEmptyState(new Error('required managed pipelines not found in namespace')),
    ).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(shouldShowNoDSPAEmptyState('string error')).toBe(false);
    expect(shouldShowNoDSPAEmptyState(null)).toBe(false);
  });
});

describe('shouldShowManagedPipelinesMissing', () => {
  it('returns true for managed pipelines not found message', () => {
    expect(
      shouldShowManagedPipelinesMissing(
        new Error(
          'required managed pipelines not found in namespace - enable AutoML and AutoRAG pipelines on the pipeline server',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for singular pipeline message', () => {
    expect(
      shouldShowManagedPipelinesMissing(
        new Error(
          'required managed pipeline not found in namespace - enable AutoML on the pipeline server',
        ),
      ),
    ).toBe(false);
  });

  it('returns false for no DSPA message', () => {
    expect(
      shouldShowManagedPipelinesMissing(
        new Error('no Pipeline Server (DSPipelineApplication) found in namespace'),
      ),
    ).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(shouldShowManagedPipelinesMissing('string error')).toBe(false);
  });
});

describe('shouldShowConfigurePipelineServerEmptyState', () => {
  beforeEach(() => {
    mockGetGenericErrorCode.mockReturnValue(undefined);
  });

  it('returns true for missing managed pipelines message', () => {
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error(
          'required managed pipelines not found in namespace - enable AutoML and AutoRAG pipelines on the pipeline server',
        ),
      ),
    ).toBe(true);
  });

  it('returns true for no Pipeline Server (DSPipelineApplication) message', () => {
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('no Pipeline Server (DSPipelineApplication) found in namespace'),
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

  it('returns false for 404 when message does not match', () => {
    mockGetGenericErrorCode.mockReturnValue(404);
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('the requested resource could not be found'),
      ),
    ).toBe(false);
  });

  it('returns false for unrelated 500 errors', () => {
    mockGetGenericErrorCode.mockReturnValue(500);
    expect(shouldShowConfigurePipelineServerEmptyState(new Error('upstream timeout'))).toBe(false);
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
    expect(
      shouldShowConfigurePipelineServerEmptyState(
        new Error('Pipeline Server (DSPA) found in namespace x but API URL missing'),
      ),
    ).toBe(true);
  });
});
