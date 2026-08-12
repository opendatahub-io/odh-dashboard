import * as React from 'react';
import { render, screen } from '@testing-library/react';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';

describe('BenchmarkThresholdField', () => {
  it('should render with the provided value', () => {
    render(<BenchmarkThresholdField value={25} onChange={jest.fn()} />);

    const input = screen.getByRole('spinbutton', { name: 'Benchmark threshold' });
    expect(input).toHaveValue(25);
  });

  it('should render with custom label', () => {
    render(
      <BenchmarkThresholdField value={70} onChange={jest.fn()} label="Benchmark suite threshold" />,
    );

    expect(screen.getByText('Benchmark suite threshold')).toBeInTheDocument();
  });

  it('should render slider with correct min/max range', () => {
    render(<BenchmarkThresholdField value={25} onChange={jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '25');
  });

  it('should display 0 and 100 boundary labels', () => {
    render(<BenchmarkThresholdField value={50} onChange={jest.fn()} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should sync internal state when value prop changes', () => {
    const { rerender } = render(<BenchmarkThresholdField value={25} onChange={jest.fn()} />);

    const input = screen.getByRole('spinbutton', { name: 'Benchmark threshold' });
    expect(input).toHaveValue(25);

    rerender(<BenchmarkThresholdField value={80} onChange={jest.fn()} />);
    expect(input).toHaveValue(80);
  });

  it('should render the default description text', () => {
    render(<BenchmarkThresholdField value={50} onChange={jest.fn()} />);

    expect(
      screen.getByText(
        'Set the minimum passing score for this evaluation. Results below this threshold will be marked as failing.',
      ),
    ).toBeInTheDocument();
  });

  it('should render a custom description', () => {
    render(
      <BenchmarkThresholdField
        value={50}
        onChange={jest.fn()}
        description="Custom description text"
      />,
    );

    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });

  it('should not render a help popover when helpText is not provided', () => {
    render(<BenchmarkThresholdField value={50} onChange={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'More info for benchmark threshold' }),
    ).not.toBeInTheDocument();
  });

  it('should render a help popover when helpText is provided', () => {
    render(
      <BenchmarkThresholdField value={50} onChange={jest.fn()} helpText="Some help content" />,
    );

    expect(
      screen.getByRole('button', { name: 'More info for benchmark threshold' }),
    ).toBeInTheDocument();
  });
});
