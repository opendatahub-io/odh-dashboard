import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { EvaluationJobState } from '~/app/types';
import EvaluationStatusLabel from '../EvaluationStatusLabel';

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
});
