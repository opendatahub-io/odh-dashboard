import * as React from 'react';
import { render, screen } from '@testing-library/react';
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
  stopping: { text: 'Stopping', color: 'grey' },
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

  it.each(states)('should render with outline variant for "%s" state', (state) => {
    render(<EvaluationStatusLabel state={state} />);
    expect(screen.getByTestId(`status-label-${state}`)).toHaveClass('pf-m-outline');
  });
});
