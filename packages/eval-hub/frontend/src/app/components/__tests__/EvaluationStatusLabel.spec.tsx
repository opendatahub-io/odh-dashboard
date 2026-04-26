import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabelProps } from '@patternfly/react-core';
import { EvaluationJobState } from '~/app/types';
import EvaluationStatusLabel from '~/app/components/EvaluationStatusLabel';

type ExpectedLabelConfig = {
  text: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
};

type ExpectedLabelConfigWithVariant = ExpectedLabelConfig & { isFilled?: boolean };

const EXPECTED_LABELS: Record<EvaluationJobState, ExpectedLabelConfigWithVariant> = {
  pending: { text: 'Pending', color: 'purple' },
  running: { text: 'Running', color: 'blue' },
  completed: { text: 'Complete', status: 'success' },
  failed: { text: 'Failed', status: 'danger', isFilled: true },
  cancelled: { text: 'Canceled', color: 'grey' },
  stopping: { text: 'Canceling', color: 'grey' },
  stopped: { text: 'Stopped', color: 'grey' },
};

describe('EvaluationStatusLabel', () => {
  const states = Object.keys(EXPECTED_LABELS) as EvaluationJobState[];

  it.each(states)('should render the correct label for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    expect(screen.getByTestId(`status-label-${state}`)).toHaveTextContent(
      EXPECTED_LABELS[state].text,
    );
  });

  it.each(states)('should render a test id for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    expect(screen.getByTestId(`status-label-${state}`)).toBeInTheDocument();
  });

  it.each(states)('should render the correct color or status class for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    const label = screen.getByTestId(`status-label-${state}`);
    const { color, status } = EXPECTED_LABELS[state];
    if (status) {
      expect(label).toHaveClass(`pf-m-${status}`);
    } else if (color && color !== 'grey') {
      expect(label).toHaveClass(`pf-m-${color}`);
    }

    if (!status && (!color || color === 'grey')) {
      expect(label).not.toHaveClass('pf-m-success');
      expect(label).not.toHaveClass('pf-m-danger');
      expect(label).not.toHaveClass('pf-m-info');
    }
  });

  it.each(states)('should render with correct variant for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    const label = screen.getByTestId(`status-label-${state}`);
    if (EXPECTED_LABELS[state].isFilled) {
      expect(label).toHaveClass('pf-m-filled');
    } else {
      expect(label).toHaveClass('pf-m-outline');
    }
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
