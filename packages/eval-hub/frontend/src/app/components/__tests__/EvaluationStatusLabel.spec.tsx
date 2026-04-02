import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvaluationJobState } from '~/app/types';
import EvaluationStatusLabel from '~/app/components/EvaluationStatusLabel';

const EXPECTED_LABELS: Record<EvaluationJobState, string> = {
  pending: 'Pending',
  running: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  stopping: 'Stopping',
  stopped: 'Stopped',
};

describe('EvaluationStatusLabel', () => {
  const states = Object.keys(EXPECTED_LABELS) as EvaluationJobState[];

  it.each(states)('should render the correct label for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    expect(screen.getByTestId(`status-label-${state}`)).toHaveTextContent(EXPECTED_LABELS[state]);
  });

  it.each(states)('should render a test id for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    expect(screen.getByTestId(`status-label-${state}`)).toBeInTheDocument();
  });

  it('should show a popover with the error message when failed label is clicked', () => {
    const errorMessage = 'Benchmark arc_easy failed with message: model not found';
    render(<EvaluationStatusLabel state="failed" message={errorMessage} />);

    fireEvent.click(screen.getByTestId('status-label-failed'));

    expect(screen.getByText('Evaluation failed')).toBeInTheDocument();
    expect(
      screen.getByText('Benchmark arc_easy failed with message: model not found'),
    ).toBeInTheDocument();
  });

  it('should split multi-line error messages into separate items in the popover', () => {
    const errorMessage = 'Evaluation job is failed.\nBenchmark arc_easy failed with message: error';
    render(<EvaluationStatusLabel state="failed" message={errorMessage} />);

    fireEvent.click(screen.getByTestId('status-label-failed'));

    expect(screen.getByText('Evaluation job is failed.')).toBeInTheDocument();
    expect(screen.getByText('Benchmark arc_easy failed with message: error')).toBeInTheDocument();
  });

  it('should not show a popover for failed state without a message', () => {
    render(<EvaluationStatusLabel state="failed" />);
    expect(screen.queryByTestId('evaluation-status-popover')).not.toBeInTheDocument();
  });

  it('should not show a popover for non-failed states even with a message', () => {
    render(<EvaluationStatusLabel state="completed" message="some message" />);
    expect(screen.queryByTestId('evaluation-status-popover')).not.toBeInTheDocument();
  });
});
