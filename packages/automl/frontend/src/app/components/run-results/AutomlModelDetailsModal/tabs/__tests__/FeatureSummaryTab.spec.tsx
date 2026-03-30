/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FeatureImportanceData } from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import FeatureSummaryTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/FeatureSummaryTab';

const baseModel: AutomlModel = {
  display_name: 'TestModel',
  model_config: { eval_metric: 'accuracy' },
  location: { model_directory: '/', predictor: '/p.pkl', notebook: '/n.ipynb' },
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
  it('should render skeleton loading state when featureImportance is undefined', () => {
    const { container } = render(<FeatureSummaryTab {...defaultProps} />);
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
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

  it('should show no data rows when search matches nothing', async () => {
    const user = userEvent.setup();
    render(<FeatureSummaryTab {...defaultProps} featureImportance={sampleImportance} />);

    const searchInput = screen.getByPlaceholderText('Search feature names');
    await user.type(searchInput, 'nonexistent');

    const rows = screen.getAllByRole('row');
    // Only header row should remain
    expect(rows).toHaveLength(1);
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

    const { container } = render(
      <FeatureSummaryTab {...defaultProps} featureImportance={zeroImportance} />,
    );

    expect(screen.getByText('feature_a')).toBeInTheDocument();
    expect(screen.getByText('feature_b')).toBeInTheDocument();

    // All bars should have 0% width, not NaN%
    const bars = container.querySelectorAll('[style]');
    bars.forEach((bar) => {
      const style = bar.getAttribute('style') ?? '';
      expect(style).not.toContain('NaN');
    });
  });
});
