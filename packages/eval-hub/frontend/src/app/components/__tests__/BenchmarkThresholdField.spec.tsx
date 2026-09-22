import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('should render raw metric thresholds as whole numbers in an unbounded numeric input', () => {
    const onChange = jest.fn();
    render(
      <BenchmarkThresholdField value={250} metric="output_tokens_per_second" onChange={onChange} />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Benchmark threshold' });
    const inputGroup = input.closest('.pf-v6-c-input-group');
    expect(input).toHaveValue(250);
    expect(screen.getByText('output tokens/s')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('step', '1');
    expect(inputGroup).toHaveClass('pf-v6-u-w-50');

    fireEvent.change(input, { target: { value: '1250.25' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(1250);
    expect(onChange).toHaveBeenCalledWith(1250);
  });

  it('should render Inspect accuracy thresholds with a percentage slider', () => {
    render(<BenchmarkThresholdField value={75} metric="Accuracy/accuracy" onChange={jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('spinbutton', { name: 'Benchmark threshold' })).toHaveValue(75);
  });

  it('should preserve decimal thresholds for flat metrics', () => {
    const onChange = jest.fn();
    render(<BenchmarkThresholdField value={0.05} metric="Accuracy/stderr" onChange={onChange} />);

    const input = screen.getByRole('spinbutton', { name: 'Benchmark threshold' });
    expect(input).toHaveValue(0.05);
    expect(input).toHaveAttribute('step', 'any');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '0.025' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(0.025);
    expect(onChange).toHaveBeenCalledWith(0.025);
  });

  it('should render unknown metric thresholds as flat numeric inputs without a unit', () => {
    render(<BenchmarkThresholdField value={0.52} metric="custom_metric" onChange={jest.fn()} />);

    expect(screen.getByRole('spinbutton', { name: 'Benchmark threshold' })).toHaveValue(0.52);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByText('custom_metric')).not.toBeInTheDocument();
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
