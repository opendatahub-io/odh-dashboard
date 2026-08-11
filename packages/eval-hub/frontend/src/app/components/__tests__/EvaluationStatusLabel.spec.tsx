import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
  // eslint-disable-next-line camelcase
  partially_failed: { text: 'Partially failed', status: 'warning' },
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

  it('should call onClick when a failed label is clicked', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="failed" onClick={onClick} />);

    const label = screen.getByTestId('status-label-failed');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when a partially_failed label is clicked', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="partially_failed" onClick={onClick} />);

    const label = screen.getByTestId('status-label-partially_failed');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not be clickable when onClick is not provided', () => {
    render(<EvaluationStatusLabel state="failed" />);
    const label = screen.getByTestId('status-label-failed');
    expect(label).not.toHaveAttribute('onClick');
  });

  it('should call onClick for any state when provided', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="completed" onClick={onClick} />);

    const label = screen.getByTestId('status-label-completed');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
