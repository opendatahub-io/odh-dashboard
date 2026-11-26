/* eslint-disable camelcase -- API schema field names */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DatasetSample } from '~/app/hooks/useS3GetFileSchemaQuery';
import DatasetCompatibilityCheck from '~/app/components/configure/DatasetCompatibilityCheck';

const sample = (type: 'double' | 'string' = 'double'): DatasetSample => ({
  columns: [{ name: 'amount', type, task_type: 'regression' }],
  sampleRows: Array.from({ length: 21 }, (_, index) => [`row-${index + 1}`]),
  sampleSize: 21,
  parseWarnings: 0,
});

const props = () => ({
  training: sample(),
  test: sample(),
  trainingFile: 'train.csv',
  testFile: 'test.csv',
  isChecking: false,
  hasError: false,
  onViewFile: jest.fn(),
});

describe('DatasetCompatibilityCheck', () => {
  it('should wait for both files and hide results while checking or after a sampling failure', () => {
    const { rerender } = render(<DatasetCompatibilityCheck {...props()} testFile="" />);
    expect(screen.queryByText('View details')).not.toBeInTheDocument();
    rerender(<DatasetCompatibilityCheck {...props()} isChecking />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking compatibility');
    expect(
      screen.queryByRole('heading', { name: /Compatibility check passed/ }),
    ).not.toBeInTheDocument();
    rerender(<DatasetCompatibilityCheck {...props()} hasError />);
    expect(screen.queryByText('View details')).not.toBeInTheDocument();
  });

  it('should not compare the same training and test file', () => {
    render(<DatasetCompatibilityCheck {...props()} testFile="train.csv" />);
    expect(screen.queryByText('View details')).not.toBeInTheDocument();
    expect(screen.queryByText(/Compatibility check passed/)).not.toBeInTheDocument();
  });

  it('should describe insufficient values as inconclusive rather than a schema conflict', () => {
    const input = props();
    input.test.columns[0].unique_count = 0;
    render(<DatasetCompatibilityCheck {...input} />);
    expect(
      screen.getByRole('heading', { name: /Compatibility check: inconclusive/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/conflicting schemas/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByRole('cell', { name: 'Insufficient sample values' })).toBeInTheDocument();
  });

  it('should show matching column details without an inconsistency warning in a tear sheet', () => {
    render(<DatasetCompatibilityCheck {...props()} />);
    expect(screen.getByRole('heading', { name: /Compatibility check passed/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    const dialog = screen.getByRole('dialog', { name: 'Compatibility check' });
    expect(
      within(dialog).getByText(
        'Review the sampled data below. Sampled rows are compatible, but differences in unchecked rows might still cause your experiment to fail.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/Inconsistencies were detected/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: 'Match' })).toBeInTheDocument();
  });

  it('should show type differences, paginate both samples, and open the selected full preview', () => {
    const input = props();
    render(<DatasetCompatibilityCheck {...input} test={sample('string')} />);
    expect(
      screen.getByRole('heading', { name: /Compatibility check: incompatibilities found\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The selected files have conflicting schemas or data formats.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(
      screen.getByText(
        'Review the sampled data below. Inconsistencies were detected that might cause your experiment to fail, but you can continue anyway.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Type mismatch' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Data preview' }));
    expect(screen.getAllByRole('navigation', { name: 'top pagination' })).toHaveLength(2);
    expect(screen.queryByRole('navigation', { name: 'bottom pagination' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Previewing rows 1–10 of 21')).toHaveLength(2);
    const trainingTable = screen.getByRole('grid', { name: 'Training data preview' });
    expect(within(trainingTable).getByText('row-1')).toBeInTheDocument();
    expect(within(trainingTable).queryByText('row-11')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Go to next page')[0]);
    expect(within(trainingTable).getByText('row-11')).toBeInTheDocument();
    expect(screen.getByText('Previewing rows 11–20 of 21')).toBeInTheDocument();
    expect(screen.getByText('Previewing rows 1–10 of 21')).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Go to last page')[0]);
    expect(screen.getByText('Previewing rows 21–21 of 21')).toBeInTheDocument();
    expect(within(trainingTable).getByText('row-21')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'View file' })[1]);
    expect(input.onViewFile).toHaveBeenCalledWith('test.csv');
  });

  it('should clamp the preview page when a refreshed sample has fewer rows', () => {
    const input = props();
    const { rerender } = render(<DatasetCompatibilityCheck {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Data preview' }));
    fireEvent.click(screen.getAllByLabelText('Go to last page')[0]);
    expect(screen.getByText('Previewing rows 21–21 of 21')).toBeInTheDocument();

    const training = { ...input.training, sampleRows: [['replacement']], sampleSize: 1 };
    rerender(<DatasetCompatibilityCheck {...input} training={training} />);
    expect(screen.getByText('Previewing rows 1–1 of 1')).toBeInTheDocument();
    expect(
      within(screen.getByRole('grid', { name: 'Training data preview' })).getByText('replacement'),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText('Go to next page')[0]).toBeDisabled();
  });

  it('should preserve the open comparison, focus, and sample page during refresh', () => {
    const input = props();
    const { rerender } = render(<DatasetCompatibilityCheck {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Data preview' }));
    fireEvent.click(screen.getAllByLabelText('Go to next page')[0]);
    const viewFile = screen.getAllByRole('button', { name: 'View file' })[0];
    viewFile.focus();
    const table = screen.getByRole('grid', { name: 'Training data preview' });
    rerender(<DatasetCompatibilityCheck {...input} isChecking />);
    expect(screen.getByRole('dialog', { name: 'Compatibility check' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing compatibility');
    expect(viewFile).toHaveFocus();
    expect(screen.getByRole('grid', { name: 'Training data preview' })).toBe(table);
    expect(within(table).getByText('row-11')).toBeInTheDocument();
    rerender(<DatasetCompatibilityCheck {...input} />);
    expect(screen.queryByText('Refreshing compatibility…')).not.toBeInTheDocument();
    expect(viewFile).toHaveFocus();
    expect(within(table).getByText('row-11')).toBeInTheDocument();
  });

  it('should preserve the comparison tab when returning from a file preview', () => {
    const input = props();
    const { rerender } = render(<DatasetCompatibilityCheck {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Data preview' }));
    rerender(<DatasetCompatibilityCheck {...input} isCovered />);
    expect(screen.getByRole('dialog', { name: 'Compatibility check' })).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    rerender(<DatasetCompatibilityCheck {...input} />);
    expect(screen.getByRole('tab', { name: 'Data preview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('grid', { name: 'Training data preview' })).toBeInTheDocument();
  });

  it('should warn about skipped records even when all column types match', () => {
    const input = props();
    input.test.parseWarnings = 2;
    render(<DatasetCompatibilityCheck {...input} />);
    expect(
      screen.getByRole('heading', { name: /Compatibility check: inconclusive/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/conflicting schemas/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Compatibility check passed/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByText(/Skipped 0 training rows and 2 test rows/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Data preview' }));
    expect(screen.getAllByText('Some rows could not be sampled')).toHaveLength(1);
  });
});
