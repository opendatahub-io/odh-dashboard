import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RunStatus } from '@patternfly/react-topology';
import PipelineRunStatusSummary from '#~/concepts/topology/PipelineRunStatusSummary';
import { AccessibleStep } from '#~/concepts/topology/accessibleSteps';

const createStep = (id: string, status: RunStatus): AccessibleStep => ({
  id,
  label: id,
  status,
  statusLabel: status === RunStatus.Cancelled ? 'Canceled' : status,
  sortIndex: 0,
});

describe('PipelineRunStatusSummary', () => {
  it('shows task counts and lets users open every failed task', () => {
    const onNodeSelect = jest.fn();
    const steps = [
      createStep('failed-one', RunStatus.Failed),
      createStep('failed-two', RunStatus.Failed),
      createStep('cancelled', RunStatus.Cancelled),
      createStep('succeeded', RunStatus.Succeeded),
    ];

    render(<PipelineRunStatusSummary steps={steps} onNodeSelect={onNodeSelect} />);

    expect(screen.getByRole('region', { name: 'Pipeline run step status summary' })).toBeVisible();
    expect(screen.getByTestId('pipeline-status-count-Failed')).toHaveTextContent('2 Failed');
    expect(screen.getByTestId('pipeline-status-count-Cancelled')).toHaveTextContent('1 Canceled');
    expect(screen.getByTestId('pipeline-status-count-Succeeded')).toHaveTextContent('1 Succeeded');
    fireEvent.click(screen.getByRole('button', { name: 'failed-two, Failed' }));
    expect(onNodeSelect).toHaveBeenCalledWith('failed-two');
    expect(screen.getByRole('button', { name: 'failed-one, Failed' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cancelled, Canceled' }));
    expect(onNodeSelect).toHaveBeenCalledWith('cancelled');
  });

  it('does not render a summary when there are no tasks', () => {
    const { container } = render(<PipelineRunStatusSummary steps={[]} onNodeSelect={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
