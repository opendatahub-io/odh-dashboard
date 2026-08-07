import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryScorerMetricField from '~/app/components/PrimaryScorerMetricField';

describe('PrimaryScorerMetricField', () => {
  const metrics = ['accuracy', 'f1', 'perplexity'];

  it('should render with the selected metric displayed', () => {
    render(<PrimaryScorerMetricField metrics={metrics} selected="accuracy" onChange={jest.fn()} />);

    expect(screen.getByTestId('primary-scorer-metric-toggle')).toHaveTextContent('Accuracy');
  });

  it('should show placeholder when no metric is selected', () => {
    render(
      <PrimaryScorerMetricField metrics={metrics} selected={undefined} onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('primary-scorer-metric-toggle')).toHaveTextContent('Select a metric');
  });

  it('should render nothing when metrics list is empty', () => {
    const { container } = render(
      <PrimaryScorerMetricField metrics={[]} selected={undefined} onChange={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should show all metrics in dropdown when opened', () => {
    render(<PrimaryScorerMetricField metrics={metrics} selected="accuracy" onChange={jest.fn()} />);

    fireEvent.click(screen.getByTestId('primary-scorer-metric-toggle'));

    expect(screen.getByRole('option', { name: 'Accuracy' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'F1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Perplexity' })).toBeInTheDocument();
  });

  it('should call onChange when a metric is selected', () => {
    const onChange = jest.fn();
    render(<PrimaryScorerMetricField metrics={metrics} selected="accuracy" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('primary-scorer-metric-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'F1' }));

    expect(onChange).toHaveBeenCalledWith('f1');
  });

  it('should close dropdown after selection', () => {
    render(<PrimaryScorerMetricField metrics={metrics} selected="accuracy" onChange={jest.fn()} />);

    fireEvent.click(screen.getByTestId('primary-scorer-metric-toggle'));
    expect(screen.getByRole('option', { name: 'F1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'F1' }));
    expect(screen.queryByRole('option', { name: 'F1' })).not.toBeInTheDocument();
  });

  it('should render the label and description', () => {
    render(<PrimaryScorerMetricField metrics={metrics} selected="accuracy" onChange={jest.fn()} />);

    expect(screen.getByText('Primary scorer metric')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Choose the primary metric used to calculate the result for this benchmark.',
      ),
    ).toBeInTheDocument();
  });
});
