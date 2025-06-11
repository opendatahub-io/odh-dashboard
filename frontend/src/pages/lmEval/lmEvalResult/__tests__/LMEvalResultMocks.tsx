import * as React from 'react';
import { EvaluationResult } from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';

// Create mock functions
const mockUseParams = jest.fn();
const mockDownloadString = jest.fn();
const mockParseEvaluationResults = jest.fn();

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: mockUseParams,
}));

jest.mock('#~/utilities/string', () => ({
  downloadString: mockDownloadString,
}));

jest.mock('react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock the utils module
jest.mock('#~/pages/lmEval/lmEvalResult/utils', () => ({
  parseEvaluationResults: mockParseEvaluationResults,
}));

// Export the mocks for use in tests
export { mockUseParams, mockDownloadString, mockParseEvaluationResults };

jest.mock(
  '#~/pages/lmEval/lmEvalResult/LMEvalResultTable',
  () =>
    function MockLMEvalResultTable({ results }: { results: EvaluationResult[] }) {
      return <div data-testid="lm-eval-result-table">Results: {results.length}</div>;
    },
);

jest.mock(
  '#~/pages/lmEval/components/LMEvalResultApplicationPage',
  () =>
    function MockLMEvalResultApplicationPage({
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
