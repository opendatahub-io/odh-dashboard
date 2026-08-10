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

const EXPECTED_LABELS: Record<EvaluationJobState, ExpectedLabelConfig> = {
  pending: { text: 'Pending', color: 'purple' },
  running: { text: 'Running', color: 'blue' },
  completed: { text: 'Complete', status: 'success' },
  failed: { text: 'Failed', status: 'danger' },
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

  it.each(states)('should render with filled variant for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    const label = screen.getByTestId(`status-label-${state}`);
    expect(label).toHaveClass('pf-m-filled');
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
    expect(within(label).queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onClick for any state when provided', () => {
    const onClick = jest.fn();
    render(<EvaluationStatusLabel state="completed" onClick={onClick} />);

    const label = screen.getByTestId('status-label-completed');
    fireEvent.click(within(label).getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe('isPreStartFailure', () => {
    it('should show "Failed (not started)" label when isPreStartFailure is true', () => {
      render(<EvaluationStatusLabel state="failed" isPreStartFailure />);
      expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed (not started)');
    });

    it('should show "Failed (not started)" label for partially_failed with isPreStartFailure', () => {
      render(<EvaluationStatusLabel state="partially_failed" isPreStartFailure />);
      expect(screen.getByTestId('status-label-partially_failed')).toHaveTextContent(
        'Failed (not started)',
      );
    });

    it('should show regular "Failed" label when isPreStartFailure is false', () => {
      render(<EvaluationStatusLabel state="failed" isPreStartFailure={false} />);
      expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed');
      expect(screen.getByTestId('status-label-failed')).not.toHaveTextContent('not started');
    });

    it('should show "Evaluation failed to start" as popover header when isPreStartFailure is true', () => {
      render(<EvaluationStatusLabel state="failed" message="Pod evicted" isPreStartFailure />);
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.getByText('Evaluation failed to start')).toBeInTheDocument();
    });

    it('should show "Evaluation failed" as popover header when isPreStartFailure is false', () => {
      render(
        <EvaluationStatusLabel state="failed" message="Out of memory" isPreStartFailure={false} />,
      );
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.getByText('Evaluation failed')).toBeInTheDocument();
    });

    it('should not affect non-failed states', () => {
      render(<EvaluationStatusLabel state="running" isPreStartFailure />);
      expect(screen.getByTestId('status-label-running')).toHaveTextContent('Running');
    });
  });

  describe('messageOrigin', () => {
    it('should show "Origin:" line in popover when messageOrigin is provided', () => {
      render(
        <EvaluationStatusLabel state="failed" message="Model not found" messageOrigin="runtime" />,
      );
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.getByText('runtime')).toBeInTheDocument();
    });

    it('should not show "Origin:" line when messageOrigin is not provided', () => {
      render(<EvaluationStatusLabel state="failed" message="Model not found" />);
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.queryByText(/Origin:/)).not.toBeInTheDocument();
    });

    it('should show both origin and message lines in the popover', () => {
      render(
        <EvaluationStatusLabel state="failed" message="Benchmark failed" messageOrigin="adapter" />,
      );
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.getByText('adapter')).toBeInTheDocument();
      expect(screen.getByText('Benchmark failed')).toBeInTheDocument();
    });

    it('should show origin with changed header when both isPreStartFailure and messageOrigin are set', () => {
      render(
        <EvaluationStatusLabel
          state="failed"
          message="Pod evicted"
          messageOrigin="server"
          isPreStartFailure
        />,
      );
      fireEvent.click(screen.getByTestId('status-label-failed'));
      expect(screen.getByText('Evaluation failed to start')).toBeInTheDocument();
      expect(screen.getByText('server')).toBeInTheDocument();
    });
  });
});
