import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LMEvalResultTable, {
  EvaluationResult,
} from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';
import { mockResults, incompleteResults, zeroResults, emptyResults } from './LMEvalResultMockData';

// Helper functions
const setupUserAndRender = (results: EvaluationResult[] = mockResults) => {
  const user = userEvent.setup();
  render(<LMEvalResultTable results={results} />);
  return { user };
};

const searchByText = async (user: ReturnType<typeof userEvent.setup>, searchText: string) => {
  const searchInput = screen.getByPlaceholderText('Find by task name');
  await user.type(searchInput, searchText);
  return searchInput;
};

const expectTableHeaders = () => {
  expect(screen.getAllByText('Task')[1]).toBeInTheDocument();
  expect(screen.getAllByText('Metric')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Value')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Error')[0]).toBeInTheDocument();
};

const expectRowCount = (expectedCount: number) => {
  expect(screen.getAllByRole('row')).toHaveLength(expectedCount);
};

describe('LMEvalResultTable', () => {
  describe('Basic Rendering', () => {
    it('should render table with correct headers', () => {
      render(<LMEvalResultTable results={mockResults} />);
      expectTableHeaders();
    });

    it('should render table content with correct data', () => {
      render(<LMEvalResultTable results={mockResults} />);

      expectRowCount(6); // 5 data rows + 1 header row

      // Verify task and metric names
      expect(screen.getAllByText('hellaswag')).toHaveLength(2);
      expect(screen.getAllByText('arc_easy')).toHaveLength(2);
      expect(screen.getByText('winogrande')).toBeInTheDocument();
      expect(screen.getAllByText('acc,none')).toHaveLength(3);
      expect(screen.getAllByText('acc_norm,none')).toHaveLength(2);

      // Verify formatted values (5 decimal places)
      ['0.85432', '0.76543', '0.91234', '0.89876', '0.73456'].forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });

      // Verify formatted error values (4 decimal places with ± symbol)
      expect(screen.getByText('± 0.0216')).toBeInTheDocument();
      expect(screen.getByText('± 0.0123')).toBeInTheDocument();
      expect(screen.getByText('± 0.0099')).toBeInTheDocument();
      expect(screen.getAllByText('-')).toHaveLength(2); // Missing error values
    });
  });

  describe('Search and Filter Functionality', () => {
    it('should handle filter dropdown and search functionality', async () => {
      const { user } = setupUserAndRender();

      await searchByText(user, 'hellaswag');

      await waitFor(() => {
        expect(screen.getAllByText('hellaswag')).toHaveLength(2);
        expect(screen.queryByText('arc_easy')).not.toBeInTheDocument();
      });

      // Test filter dropdown options
      const filterDropdown = screen.getByTestId('column-filter');
      await user.click(filterDropdown);

      ['task', 'metric', 'value', 'error'].forEach((option) => {
        expect(screen.getByTestId(option)).toBeInTheDocument();
      });

      // Test clearing search
      const searchInput = screen.getByPlaceholderText('Find by task name');
      await user.clear(searchInput);
      await waitFor(() => {
        expect(screen.getAllByText('hellaswag')).toHaveLength(2);
        expect(screen.getAllByText('arc_easy')).toHaveLength(2);
        expect(screen.getByText('winogrande')).toBeInTheDocument();
      });
    });

    it('should handle case sensitivity in search', async () => {
      const { user } = setupUserAndRender();

      // Test various case combinations
      const testCases = [
        { search: 'HELLASWAG', expected: 'hellaswag', count: 2 },
        { search: 'Arc_EASY', expected: 'arc_easy', count: 2 },
        { search: 'ARC', expected: 'arc_easy', count: 2 },
      ];

      for (const testCase of testCases) {
        const searchInput = await searchByText(user, testCase.search);
        await waitFor(() => {
          expect(screen.getAllByText(testCase.expected)).toHaveLength(testCase.count);
        });
        await user.clear(searchInput);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      render(<LMEvalResultTable results={emptyResults} />);
      expectTableHeaders();
      expectRowCount(1); // Only header row
    });

    it('should handle missing data fields', () => {
      render(<LMEvalResultTable results={incompleteResults} />);

      expectRowCount(4); // 3 data + 1 header
      expect(screen.getAllByText('-')).toHaveLength(2); // Missing error values

      // Verify all tasks render even with missing fields
      // Note: empty string task will render as empty cell, 'empty_task' is actually a metric name
      expect(screen.getByText('test_task')).toBeInTheDocument();
      expect(screen.getByText('valid_task')).toBeInTheDocument();
      // The third task is empty string, so we check for the metric instead
      expect(screen.getByText('empty_task,none')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(<LMEvalResultTable results={zeroResults} />);

      // Verify zero and negative value formatting
      expect(screen.getByText('0.00000')).toBeInTheDocument();
      expect(screen.getByText('-0.12345')).toBeInTheDocument();

      // Verify error formatting - 0.00001 gets formatted as ± 0.0000 (rounded to 4 decimal places)
      expect(screen.getByText('± 0.0000')).toBeInTheDocument();
    });
  });
});
