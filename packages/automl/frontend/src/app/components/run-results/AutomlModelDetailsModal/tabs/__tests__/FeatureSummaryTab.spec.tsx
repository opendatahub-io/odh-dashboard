/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FeatureImportanceData } from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import FeatureSummaryTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/FeatureSummaryTab';

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

const sampleImportance: FeatureImportanceData = {
  importance: {
    color: 0.183,
    hair_length: 0.125,
    has_soul: 0.098,
    bone_length: 0.076,
  },
};

describe('FeatureSummaryTab', () => {
  it('should render skeleton loading state when isArtifactsLoading is true', () => {
    const { container } = render(<FeatureSummaryTab {...defaultProps} isArtifactsLoading />);
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show no-data empty state when featureImportance is undefined and not loading', () => {
    render(<FeatureSummaryTab {...defaultProps} />);

    expect(screen.getByTestId('feature-no-data-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No feature data available')).toBeInTheDocument();
  });

  it('should render feature names in the table', () => {
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    expect(screen.getByText('color')).toBeInTheDocument();
    expect(screen.getByText('hair_length')).toBeInTheDocument();
    expect(screen.getByText('has_soul')).toBeInTheDocument();
    expect(screen.getByText('bone_length')).toBeInTheDocument();
  });

  it('should display importance as percentage', () => {
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    expect(screen.getByText('18.30%')).toBeInTheDocument();
    expect(screen.getByText('12.50%')).toBeInTheDocument();
    expect(screen.getByText('9.80%')).toBeInTheDocument();
    expect(screen.getByText('7.60%')).toBeInTheDocument();
  });

  it('should sort features by importance descending', () => {
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const rows = screen.getAllByRole('row');
    // First row is the header; data rows follow
    const dataRows = rows.slice(1);
    const featureNames = dataRows.map(
      (row) => within(row).getByText(/color|hair_length|has_soul|bone_length/).textContent,
    );
    expect(featureNames).toEqual(['color', 'hair_length', 'has_soul', 'bone_length']);
  });

  it('should filter features by search input', async () => {
    const user = userEvent.setup();
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const searchInput = screen.getByPlaceholderText('Search feature names');
    await user.type(searchInput, 'hair');

    expect(screen.getByText('hair_length')).toBeInTheDocument();
    expect(screen.queryByText('color')).not.toBeInTheDocument();
    expect(screen.queryByText('has_soul')).not.toBeInTheDocument();
    expect(screen.queryByText('bone_length')).not.toBeInTheDocument();
  });

  it('should be case-insensitive when filtering', async () => {
    const user = userEvent.setup();
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const searchInput = screen.getByPlaceholderText('Search feature names');
    await user.type(searchInput, 'COLOR');

    expect(screen.getByText('color')).toBeInTheDocument();
  });

  it('should show all features when search is cleared', async () => {
    const user = userEvent.setup();
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const searchInput = screen.getByPlaceholderText('Search feature names');
    await user.type(searchInput, 'hair');
    expect(screen.queryByText('color')).not.toBeInTheDocument();

    await user.clear(searchInput);
    expect(screen.getByText('color')).toBeInTheDocument();
    expect(screen.getByText('hair_length')).toBeInTheDocument();
  });

  it('should show empty state when search matches nothing', async () => {
    const user = userEvent.setup();
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const searchInput = screen.getByPlaceholderText('Search feature names');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByTestId('feature-search-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No matching features')).toBeInTheDocument();
  });

  it('should render table headers', () => {
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    expect(screen.getByText('Feature name')).toBeInTheDocument();
    expect(screen.getByText('Importance')).toBeInTheDocument();
  });

  it('should handle all-zero importance values without NaN bar widths', () => {
    const zeroImportance: FeatureImportanceData = {
      importance: { feature_a: 0, feature_b: 0 },
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={zeroImportance} />);

    expect(screen.getByText('feature_a')).toBeInTheDocument();
    expect(screen.getByText('feature_b')).toBeInTheDocument();

    // All bars should have 0% width, not NaN%
    const barA = screen.getByTestId('feature-importance-bar-feature_a');
    const barB = screen.getByTestId('feature-importance-bar-feature_b');
    expect(barA.getAttribute('style')).not.toContain('NaN');
    expect(barB.getAttribute('style')).not.toContain('NaN');
  });

  it('should show no-data empty state when importance object is empty', () => {
    const emptyImportance: FeatureImportanceData = {
      importance: {},
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={emptyImportance} />);

    expect(screen.getByTestId('feature-no-data-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No feature data available')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-search-empty-state')).not.toBeInTheDocument();
    // Search toolbar should be hidden when there's no data to search
    expect(screen.queryByPlaceholderText('Search feature names')).not.toBeInTheDocument();
  });

  it('should handle negative importance values', () => {
    const negativeImportance: FeatureImportanceData = {
      importance: { feature_positive: 0.5, feature_negative: -0.3 },
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={negativeImportance} />);

    expect(screen.getByText('-30.00%')).toBeInTheDocument();
    expect(screen.getByText('50.00%')).toBeInTheDocument();

    // Bars should have valid non-negative widths (using absolute values)
    const positiveBar = screen.getByTestId('feature-importance-bar-feature_positive');
    const negativeBar = screen.getByTestId('feature-importance-bar-feature_negative');

    const positiveWidth = positiveBar.getAttribute('style') ?? '';
    const negativeWidth = negativeBar.getAttribute('style') ?? '';
    expect(positiveWidth).toMatch(/width:\s*[\d.]+%/);
    expect(negativeWidth).toMatch(/width:\s*[\d.]+%/);

    // Negative bar should have danger modifier, positive should not
    expect(negativeBar).toHaveClass('m-negative');
    expect(positiveBar).not.toHaveClass('m-negative');
  });

  it('should sort mixed positive and negative values by descending value', () => {
    const mixedImportance: FeatureImportanceData = {
      importance: { feat_a: 0.5, feat_b: -0.3, feat_c: 0.1, feat_d: -0.8 },
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={mixedImportance} />);

    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);
    const featureNames = dataRows.map((row) => within(row).getByText(/feat_/).textContent);
    // Descending by value: 0.5 > 0.1 > -0.3 > -0.8
    expect(featureNames).toEqual(['feat_a', 'feat_c', 'feat_b', 'feat_d']);
  });

  it('should display near-zero negative values as 0.00% instead of -0.00%', () => {
    const nearZeroImportance: FeatureImportanceData = {
      importance: {
        large_positive: 0.75,
        tiny_negative: -1.7133e-6,
        tiny_positive: 4.066e-7,
      },
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={nearZeroImportance} />);

    expect(screen.getByText('75.00%')).toBeInTheDocument();
    // Near-zero values should show as 0.00%, not -0.00%
    const rows = screen.getAllByRole('row').slice(1);
    const percentages = rows.map((row) => within(row).getAllByRole('cell')[1].textContent);
    expect(percentages).toEqual(['75.00%', '0.00%', '0.00%']);
    expect(screen.queryByText('-0.00%')).not.toBeInTheDocument();

    // Near-zero negative bar should not be styled as negative
    const tinyNegativeBar = screen.getByTestId('feature-importance-bar-tiny_negative');
    expect(tinyNegativeBar).not.toHaveClass('m-negative');
  });

  it('should handle a single feature with only negative importance', () => {
    const singleNegative: FeatureImportanceData = {
      importance: { only_feature: -1.0 },
    };

    render(<FeatureSummaryTab {...defaultProps} featureImportance={singleNegative} />);

    expect(screen.getByText('-100.00%')).toBeInTheDocument();

    const bar = screen.getByTestId('feature-importance-bar-only_feature');
    expect(bar).toHaveClass('m-negative');
    // Should be 100% width (abs(1.0) / abs(1.0) * 100)
    expect(bar.getAttribute('style')).toContain('width: 100%');
  });
});
