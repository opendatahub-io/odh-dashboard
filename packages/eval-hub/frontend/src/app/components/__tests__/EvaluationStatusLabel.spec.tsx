import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LabelProps } from '@patternfly/react-core';
import { EvaluationJobState } from '~/app/types';
import EvaluationStatusLabel from '~/app/components/EvaluationStatusLabel';

type ExpectedLabelConfig = {
  text: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  isFilled?: boolean;
};

const EXPECTED_LABELS: Record<EvaluationJobState, ExpectedLabelConfig> = {
  pending: { text: 'Pending', color: 'purple' },
  running: { text: 'Running', color: 'blue', isFilled: true },
  completed: { text: 'Complete', status: 'success', isFilled: true },
  failed: { text: 'Failed', status: 'danger', isFilled: true },
  cancelled: { text: 'Canceled', color: 'grey' },
  stopping: { text: 'Canceling', color: 'grey' },
  stopped: { text: 'Stopped', color: 'grey' },
  // eslint-disable-next-line camelcase
  partially_failed: { text: 'Failed', status: 'danger', isFilled: true },
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

  it.each(states)('should render the correct variant for "%s" state', (state) => {
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

    const label = screen.getByTestId('evaluation-status-button');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when a partially_failed label is clicked', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="partially_failed" onClick={onClick} />);

    const label = screen.getByTestId('evaluation-status-button');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not be clickable when onClick is not provided', () => {
    render(<EvaluationStatusLabel state="failed" />);
    const label = screen.getByTestId('status-label-failed');
    expect(within(label).queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onClick for any state when provided', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="completed" onClick={onClick} />);

    const label = screen.getByTestId('evaluation-status-button');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('EvaluationStatusLabel partially_failed', () => {
  it('should show "Failed" for partially_failed state', () => {
    render(<EvaluationStatusLabel state="partially_failed" />);
    expect(screen.getByTestId('status-label-partially_failed')).toHaveTextContent('Failed');
  });
});

describe('EvaluationStatusLabel isPreStartFailure', () => {
  it('should render "Not started" when state is failed and isPreStartFailure is true', () => {
    render(<EvaluationStatusLabel state="failed" isPreStartFailure />);
    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Not started');
  });

  it('should render "Failed" when state is failed and isPreStartFailure is false', () => {
    render(<EvaluationStatusLabel state="failed" isPreStartFailure={false} />);
    const label = screen.getByTestId('status-label-failed');
    expect(label).toHaveTextContent('Failed');
    expect(label).not.toHaveTextContent('Not started');
  });

  it('should render "Failed" when state is failed and isPreStartFailure is omitted', () => {
    render(<EvaluationStatusLabel state="failed" />);
    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed');
  });

  it('should not affect the label for non-failed states when isPreStartFailure is true', () => {
    render(<EvaluationStatusLabel state="running" isPreStartFailure />);
    const label = screen.getByTestId('status-label-running');
    expect(label).toHaveTextContent('Running');
    expect(label).not.toHaveTextContent('Not started');
  });

  it('should render danger color for pre-start failure', () => {
    render(<EvaluationStatusLabel state="failed" isPreStartFailure />);
    expect(screen.getByTestId('status-label-failed')).toHaveClass('pf-m-danger');
  });

  it('should render as filled for pre-start failure', () => {
    render(<EvaluationStatusLabel state="failed" isPreStartFailure />);
    const label = screen.getByTestId('status-label-failed');
    expect(label).toHaveClass('pf-m-filled');
  });

  it('should still use the failed data-testid for pre-start failure', () => {
    render(<EvaluationStatusLabel state="failed" isPreStartFailure />);
    expect(screen.getByTestId('status-label-failed')).toBeInTheDocument();
  });
});
