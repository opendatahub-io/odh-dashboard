import { mockLMEvalContextValue, mockParsedResults } from '#~/__mocks__/mockLMEvaluationResultData';

// Test constants
export const defaultParams = {
  evaluationName: 'test-evaluation',
  namespace: 'test-project',
};

export const mockSuccessfulHookResult = {
  data: mockLMEvalContextValue.lmEval.data[0],
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
};

export const mockEmptyHookResult = {
  data: null,
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
};

// Helper functions
export const createMockEvaluationData = (
  statusOverride: Partial<(typeof mockLMEvalContextValue.lmEval.data)[0]['status']> = {},
): (typeof mockLMEvalContextValue.lmEval.data)[0] => ({
  ...mockLMEvalContextValue.lmEval.data[0],
  status: {
    ...mockLMEvalContextValue.lmEval.data[0].status,
    ...statusOverride,
  },
});

export type MockHookResult =
  | typeof mockSuccessfulHookResult
  | typeof mockEmptyHookResult
  | {
      data: ReturnType<typeof createMockEvaluationData> | null;
      loaded: boolean;
      error: Error | undefined;
      refresh: jest.Mock;
    };

// Setup function factory - returns a function that uses the provided mock functions
export const createSetupMocks =
  (
    mockUseParams: jest.Mock,
    mockUseLMEvalResult: jest.Mock,
    mockParseEvaluationResults: jest.Mock,
  ) =>
  (
    params: Partial<{ evaluationName: string; namespace: string }> = defaultParams,
    hookResult: MockHookResult = mockSuccessfulHookResult,
    parseResults = mockParsedResults,
  ): void => {
    mockUseParams.mockReturnValue(params);
    mockUseLMEvalResult.mockReturnValue(hookResult);
    mockParseEvaluationResults.mockReturnValue(parseResults);
  };
