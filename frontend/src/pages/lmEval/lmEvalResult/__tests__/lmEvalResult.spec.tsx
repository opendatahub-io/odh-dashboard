import * as React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EvaluationResult } from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';
import {
  defaultParams,
  mockSuccessfulHookResult,
  mockEmptyHookResult,
  createMockEvaluationData,
  renderComponent,
  createSetupMocks,
} from './lmEvalResult.helpers';

// Create mock functions that can be configured per test
const mockUseParams = jest.fn();
const mockUseLMEvalResult = jest.fn();
const mockParseEvaluationResults = jest.fn();

// Variable to capture hook call arguments
let capturedHookArgs: [string, string] | null = null;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

// Mock the useLMEvalResult hook
jest.mock('#~/pages/lmEval/lmEvalResult/useLMEvalResult', () => ({
  __esModule: true,
  default: (evaluationName: string, namespace: string) => {
    capturedHookArgs = [evaluationName, namespace];
    return mockUseLMEvalResult();
  },
}));

// Mock the utils
jest.mock('#~/pages/lmEval/lmEvalResult/utils', () => ({
  parseEvaluationResults: (results: string) => mockParseEvaluationResults(results),
}));

// Mock the LMEvalResultTable component
jest.mock(
  '#~/pages/lmEval/lmEvalResult/LMEvalResultTable',
  () =>
    function MockLMEvalResultTable({ results }: { results: EvaluationResult[] }) {
      return <div data-testid="lm-eval-result-table">Results: {results.length}</div>;
    },
);

// Mock the LMEvalFormApplicationPage component
jest.mock(
  '#~/pages/lmEval/components/LMEvalFormApplicationPage',
  () =>
    function MockLMEvalFormApplicationPage({
      loaded,
      empty,
      emptyMessage,
      title,
      breadcrumb,
      headerAction,
      children,
    }: {
      loaded?: boolean;
      empty?: boolean;
      emptyMessage?: string;
      title?: string;
      breadcrumb?: React.ReactNode;
      headerAction?: React.ReactNode;
      children?: React.ReactNode;
    }) {
      return (
        <div data-testid="lm-eval-result-app-page">
          <div>Loaded: {String(loaded)}</div>
          <div>Empty: {String(empty)}</div>
          {emptyMessage && <div>Empty Message: {emptyMessage}</div>}
          {title && <div>Title: {title}</div>}
          {breadcrumb && <div data-testid="breadcrumb">{breadcrumb}</div>}
          {headerAction && <div data-testid="header-action">{headerAction}</div>}
          {children && <div data-testid="children">{children}</div>}
        </div>
      );
    },
);

describe('LMEvalResult', () => {
  // Create the setup function using our mock functions
  const setupMocks = createSetupMocks(
    mockUseParams,
    mockUseLMEvalResult,
    mockParseEvaluationResults,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    capturedHookArgs = null;
  });

  describe('Successful Rendering', () => {
    it('should render evaluation results when evaluation exists and has results', () => {
      setupMocks();
      renderComponent();

      expect(screen.getByText('Loaded: true')).toBeInTheDocument();
      expect(screen.getByText('Empty: false')).toBeInTheDocument();
      expect(screen.getByText('Title: test-evaluation')).toBeInTheDocument();
      expect(screen.getByTestId('children')).toBeInTheDocument();
      expect(screen.getByTestId('header-action')).toBeInTheDocument();
    });

    it('should render breadcrumb correctly', () => {
      setupMocks();
      renderComponent();

      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should render not found message when evaluation does not exist', () => {
      setupMocks(
        { evaluationName: 'nonexistent-evaluation', namespace: 'test-project' },
        mockEmptyHookResult,
      );
      renderComponent();

      expect(screen.getByText('Empty: true')).toBeInTheDocument();
      expect(
        screen.getByText('Empty Message: Evaluation "nonexistent-evaluation" not found'),
      ).toBeInTheDocument();
      expect(screen.getByText('Title: nonexistent-evaluation')).toBeInTheDocument();
    });

    it('should render not available message when evaluation has no results', () => {
      setupMocks(
        defaultParams,
        {
          data: createMockEvaluationData({ results: undefined }),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        },
        [], // Empty parse results
      );
      renderComponent();

      expect(screen.getByText('Empty: true')).toBeInTheDocument();
      expect(
        screen.getByText('Empty Message: Evaluation results not yet available'),
      ).toBeInTheDocument();
      expect(screen.getByText('Title: test-evaluation')).toBeInTheDocument();
    });

    it('should render parse error message when results cannot be parsed', () => {
      setupMocks(
        defaultParams,
        {
          data: createMockEvaluationData({ results: 'invalid json' }),
          loaded: true,
          error: undefined,
          refresh: jest.fn(),
        },
        [], // Empty parse results
      );
      renderComponent();

      expect(screen.getByText('Empty: true')).toBeInTheDocument();
      expect(
        screen.getByText('Empty Message: Unable to parse evaluation results'),
      ).toBeInTheDocument();
    });

    it('should handle missing evaluationName parameter', () => {
      setupMocks({ namespace: 'test-project' }, mockEmptyHookResult);
      renderComponent();

      expect(screen.getByText('Empty Message: Evaluation "Unknown" not found')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      setupMocks(defaultParams, { ...mockEmptyHookResult, loaded: false });
      renderComponent();

      expect(screen.getByText('Loaded: false')).toBeInTheDocument();
    });

    it('should pass load error to application page', () => {
      setupMocks(defaultParams, { ...mockEmptyHookResult, error: new Error('Load failed') });
      renderComponent();

      expect(screen.getByText('Loaded: true')).toBeInTheDocument();
      expect(screen.getByText('Empty: true')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should show download button when evaluation has results', () => {
      setupMocks();
      renderComponent();

      expect(screen.getByTestId('header-action')).toBeInTheDocument();
    });

    it('should not show download button when no evaluation data', () => {
      setupMocks(defaultParams, mockEmptyHookResult);
      renderComponent();

      expect(screen.queryByTestId('header-action')).not.toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('should call useLMEvalResult with correct parameters', () => {
      setupMocks();
      renderComponent();

      expect(capturedHookArgs).toEqual(['test-evaluation', 'test-project']);
    });

    it('should call parseEvaluationResults with correct results string', () => {
      setupMocks();
      renderComponent();

      expect(mockParseEvaluationResults).toHaveBeenCalledWith(
        mockSuccessfulHookResult.data.status.results,
      );
    });
  });
});
