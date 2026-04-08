/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ConfusionMatrixData } from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import ConfusionMatrixTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ConfusionMatrixTab';

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

  it('should show no-data empty state when confusionMatrix is undefined and not loading', () => {
    render(<ConfusionMatrixTab {...defaultProps} />);

    expect(screen.getByTestId('confusion-matrix-no-data-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No confusion matrix data available')).toBeInTheDocument();
  });

  it('should render class labels as both column headers and row labels', () => {
    const matrix: ConfusionMatrixData = {
      Cat: { Cat: 8, Dog: 2 },
      Dog: { Cat: 1, Dog: 9 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Each label appears twice: once as a <th> column header and once as a <strong> row label
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

    // Each label appears as both a column header and a row label
    expect(screen.getAllByText('Ghost')).toHaveLength(2);
    expect(screen.getAllByText('Ghoul')).toHaveLength(2);
    expect(screen.getAllByText('Goblin')).toHaveLength(2);
  });

  it('should compute correct row percent-correct values', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 8, B: 2 },
      B: { A: 1, B: 9 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Row A: 8/(8+2) = 80.0%, Row B: 9/(1+9) = 90.0%
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
  });

  it('should compute correct column percent-correct values', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 6, B: 4 },
      B: { A: 3, B: 7 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Col A: 6/(6+3) = 66.7%, Col B: 7/(4+7) = 63.6%
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText('63.6%')).toBeInTheDocument();
  });

  it('should compute correct overall accuracy', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 5, B: 5 },
      B: { A: 5, B: 5 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    // Overall: (5+5)/20 = 50.0%
    const percentCells = screen.getAllByText('50.0%');
    expect(percentCells.length).toBeGreaterThanOrEqual(1);
  });

  it('should render gradient legend', () => {
    const matrix: ConfusionMatrixData = {
      A: { A: 1, B: 0 },
      B: { A: 0, B: 1 },
    };

    render(<ConfusionMatrixTab {...defaultProps} confusionMatrix={matrix} />);

    expect(screen.getByText('Less correct')).toBeInTheDocument();
    expect(screen.getByText('More correct')).toBeInTheDocument();
  });
});
