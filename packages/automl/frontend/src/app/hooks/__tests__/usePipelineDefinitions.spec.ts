import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';

describe('usePipelineDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaded immediately with no error', () => {
    const renderResult = testHook(usePipelineDefinitions)('my-namespace');

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should return loaded for empty namespace', () => {
    const renderResult = testHook(usePipelineDefinitions)('');

    expect(renderResult.result.current.loaded).toBe(true);
  });
});
