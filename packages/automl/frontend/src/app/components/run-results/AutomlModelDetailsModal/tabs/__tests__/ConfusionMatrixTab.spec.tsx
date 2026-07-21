/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConfusionMatrixData } from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import ConfusionMatrixTab, {
  computeOneVsRest,
} from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ConfusionMatrixTab';

const baseModel: AutomlModel = {
  name: 'TestModel',
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { accuracy: 0.8 } },
};

const defaultProps = {
  model: baseModel,
  taskType: 'multiclass' as const,
  parameters: { task_type: 'multiclass' as const, label_column: 'label' },
};

describe('ConfusionMatrixTab', () => {
  it('should render skeleton loading state when isArtifactsLoading is true', () => {
    const { container } = render(<ConfusionMatrixTab {...defaultProps} isArtifactsLoading />);
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render disabled view selector during loading for multiclass tasks', () => {
    render(<ConfusionMatrixTab {...defaultProps} isArtifactsLoading />);
    const toggle = screen.getByLabelText('Loading view selector');
    expect(toggle).toBeDisabled();
  });

  it('should show no-data empty state when confusionMatrix is undefined and not loading', () => {
    render(<ConfusionMatrixTab {...defaultProps} />);

    expect(screen.getByTestId('confusion-matrix-no-data-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No confusion matrix data available')).toBeInTheDocument();
  });

  it('should render class labels as column headers and row labels', () => {
    const matrix: ConfusionMatrixData = {
      Cat: { Cat: 8, Dog: 2 },
      Dog: { Cat: 1, Dog: 9 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getAllByText('Cat')).toHaveLength(2);
    expect(screen.getAllByText('Dog')).toHaveLength(2);
  });

  it('should render cell values from a 2x2 matrix', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 5, B: 3 },
      B: { A: 2, B: 7 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should render all labels from a 3x3 matrix', () => {
    const matrix: ConfusionMatrixData = {
      Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
      Ghoul: { Ghost: 1, Ghoul: 8, Goblin: 2 },
      Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getAllByText('Ghost')).toHaveLength(2);
    expect(screen.getAllByText('Ghoul')).toHaveLength(2);
    expect(screen.getAllByText('Goblin')).toHaveLength(2);
  });

  it('should render PREDICTED CLASS and ACTUAL CLASS headers', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 8, B: 2 },
      B: { A: 1, B: 9 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getByText('PREDICTED CLASS')).toBeInTheDocument();
    expect(screen.getByText('ACTUAL CLASS')).toBeInTheDocument();
  });

  it('should compute correct recall values per row', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 8, B: 2 },
      B: { A: 1, B: 9 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Row A recall: 8/(8+2) = 80.0%, Row B recall: 9/(1+9) = 90.0%
    expect(screen.getByText('Recall 80.0%')).toBeInTheDocument();
    expect(screen.getByText('Recall 90.0%')).toBeInTheDocument();
  });

  it('should compute correct precision values per column', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 6, B: 4 },
      B: { A: 3, B: 7 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Col A precision: 6/(6+3) = 66.7%, Col B precision: 7/(4+7) = 63.6%
    expect(screen.getByText('Precision 66.7%')).toBeInTheDocument();
    expect(screen.getByText('Precision 63.6%')).toBeInTheDocument();
  });

  it('should display overall accuracy in stat box', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 5, B: 5 },
      B: { A: 5, B: 5 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    const statBox = screen.getByTestId('confusion-matrix-accuracy');
    expect(within(statBox).getByText('Overall accuracy')).toBeInTheDocument();
    expect(within(statBox).getByText('50.0%')).toBeInTheDocument();
  });

  it('should render correct prediction legend', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 1, B: 0 },
      B: { A: 0, B: 1 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getByText('Correct prediction')).toBeInTheDocument();
  });

  it('should display 0.0% recall when a row total is zero', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 0, B: 0 },
      B: { A: 0, B: 5 },
    };
    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);
    expect(screen.getByText('Recall 0.0%')).toBeInTheDocument();
    expect(screen.getByText('Recall 100.0%')).toBeInTheDocument();
  });

  describe('One vs Rest view', () => {
    const matrix3x3: ConfusionMatrixData = {
      Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
      Ghoul: { Ghost: 1, Ghoul: 10, Goblin: 2 },
      Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
    };

    it('should show view selector for 3+ class matrices', () => {
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix3x3} />);
      expect(screen.getByTestId('confusion-matrix-view-toggle')).toBeInTheDocument();
      expect(screen.getByText('Multi-class')).toBeInTheDocument();
    });

    it('should not show view selector for non-multiclass tasks even with 3+ classes', () => {
      render(
        <ConfusionMatrixTab {...defaultProps} taskType="binary" confusionMatrix={matrix3x3} />,
      );
      expect(screen.queryByTestId('confusion-matrix-view-toggle')).not.toBeInTheDocument();
    });

    it('should not show view selector for 2-class matrices', () => {
      const matrix2x2: ConfusionMatrixData = {
        Cat: { Cat: 8, Dog: 2 },
        Dog: { Cat: 1, Dog: 9 },
      };
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix2x2} />);
      expect(screen.queryByTestId('confusion-matrix-view-toggle')).not.toBeInTheDocument();
    });

    it('should show One v. Rest options in the dropdown', async () => {
      const user = userEvent.setup();
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix3x3} />);

      await user.click(screen.getByTestId('confusion-matrix-view-toggle'));

      expect(screen.getByText('Ghost (One v. Rest)')).toBeInTheDocument();
      expect(screen.getByText('Ghoul (One v. Rest)')).toBeInTheDocument();
      expect(screen.getByText('Goblin (One v. Rest)')).toBeInTheDocument();
    });

    it('should collapse to 2x2 matrix when One v. Rest view is selected', async () => {
      const user = userEvent.setup();
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix3x3} />);

      await user.click(screen.getByTestId('confusion-matrix-view-toggle'));
      await user.click(screen.getByText('Ghost (One v. Rest)'));

      const table = screen.getByRole('grid');
      expect(within(table).getAllByText('Ghost')).toHaveLength(2);
      expect(within(table).getAllByText('Not Ghost')).toHaveLength(2);

      expect(within(table).queryByText('Ghoul')).not.toBeInTheDocument();
      expect(within(table).queryByText('Goblin')).not.toBeInTheDocument();
    });

    it('should compute correct One v. Rest values for Ghost', async () => {
      const user = userEvent.setup();
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix3x3} />);

      await user.click(screen.getByTestId('confusion-matrix-view-toggle'));
      await user.click(screen.getByText('Ghost (One v. Rest)'));

      // Ghost row: TP=10, FN=0+2=2 → row total=12
      // Not Ghost row: FP=1+2=3, TN=10+2+6+5=23 → row total=26
      expect(screen.getByText('10')).toBeInTheDocument(); // TP
      expect(screen.getByText('2')).toBeInTheDocument(); // FN
      expect(screen.getByText('3')).toBeInTheDocument(); // FP
      expect(screen.getByText('23')).toBeInTheDocument(); // TN

      // Ghost recall: 10/(10+2) = 83.3%, Not Ghost recall: 23/(3+23) = 88.5%
      expect(screen.getByText('Recall 83.3%')).toBeInTheDocument();
      expect(screen.getByText('Recall 88.5%')).toBeInTheDocument();
      // Ghost precision: 10/(10+3) = 76.9%, Not Ghost precision: 23/(2+23) = 92.0%
      expect(screen.getByText('Precision 76.9%')).toBeInTheDocument();
      expect(screen.getByText('Precision 92.0%')).toBeInTheDocument();
    });

    it('should switch back to multi-class view', async () => {
      const user = userEvent.setup();
      render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix3x3} />);

      await user.click(screen.getByTestId('confusion-matrix-view-toggle'));
      await user.click(screen.getByText('Ghost (One v. Rest)'));

      await user.click(screen.getByTestId('confusion-matrix-view-toggle'));
      await user.click(screen.getByText('Multi-class'));

      const table = screen.getByRole('grid');
      expect(within(table).getAllByText('Ghost')).toHaveLength(2);
      expect(within(table).getAllByText('Ghoul')).toHaveLength(2);
      expect(within(table).getAllByText('Goblin')).toHaveLength(2);
    });
  });
});

describe('computeOneVsRest', () => {
  const matrix3x3: ConfusionMatrixData = {
    Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
    Ghoul: { Ghost: 1, Ghoul: 10, Goblin: 2 },
    Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
  };
  const labels3 = ['Ghost', 'Ghoul', 'Goblin'];

  it('should compute correct TP, FN, FP, TN for Ghost', () => {
    const result = computeOneVsRest(matrix3x3, labels3, 'Ghost');
    expect(result).toEqual({
      Ghost: { Ghost: 10, 'Not Ghost': 2 },
      'Not Ghost': { Ghost: 3, 'Not Ghost': 23 },
    });
  });

  it('should compute correct TP, FN, FP, TN for Ghoul', () => {
    const result = computeOneVsRest(matrix3x3, labels3, 'Ghoul');
    expect(result).toEqual({
      Ghoul: { Ghoul: 10, 'Not Ghoul': 3 },
      'Not Ghoul': { Ghoul: 6, 'Not Ghoul': 19 },
    });
  });

  it('should compute correct TP, FN, FP, TN for Goblin', () => {
    const result = computeOneVsRest(matrix3x3, labels3, 'Goblin');
    expect(result).toEqual({
      Goblin: { Goblin: 5, 'Not Goblin': 8 },
      'Not Goblin': { Goblin: 4, 'Not Goblin': 21 },
    });
  });

  it('should preserve total count across all cells', () => {
    const result = computeOneVsRest(matrix3x3, labels3, 'Ghost');
    const ghostRow = result.Ghost ?? {};
    const notGhostRow = result['Not Ghost'] ?? {};
    const total =
      (ghostRow.Ghost ?? 0) +
      (ghostRow['Not Ghost'] ?? 0) +
      (notGhostRow.Ghost ?? 0) +
      (notGhostRow['Not Ghost'] ?? 0);
    expect(total).toBe(38);
  });

  it('should handle a matrix with all zeros', () => {
    const zeroMatrix: ConfusionMatrixData = {
      A: { A: 0, B: 0 },
      B: { A: 0, B: 0 },
    };
    const result = computeOneVsRest(zeroMatrix, ['A', 'B'], 'A');
    expect(result).toEqual({
      A: { A: 0, 'Not A': 0 },
      'Not A': { A: 0, 'Not A': 0 },
    });
  });

  it('should handle missing cells gracefully', () => {
    const sparseMatrix: ConfusionMatrixData = {
      X: { X: 5 },
      Y: { Y: 3 },
    };
    const result = computeOneVsRest(sparseMatrix, ['X', 'Y'], 'X');
    expect(result).toEqual({
      X: { X: 5, 'Not X': 0 },
      'Not X': { X: 0, 'Not X': 3 },
    });
  });
});
