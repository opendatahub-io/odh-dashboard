import { usePipelineRunQuery as useCorePipelineRunQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { renderHook } from '@testing-library/react';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';
import { usePipelineRunQuery } from '~/app/hooks/usePipelineRunQuery';

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  usePipelineRunQuery: jest.fn(),
}));

const useCorePipelineRunQueryMock = jest.mocked(useCorePipelineRunQuery);

describe('usePipelineRunQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCorePipelineRunQueryMock.mockReturnValue({} as ReturnType<typeof useCorePipelineRunQuery>);
  });

  it('should provide the pipeline run normalizer as the select function', () => {
    renderHook(() => usePipelineRunQuery('run-1', 'namespace'));

    expect(useCorePipelineRunQueryMock).toHaveBeenCalledWith(
      'run-1',
      'namespace',
      normalizePipelineRun,
    );
  });
});
