import React from 'react';
import { render, screen } from '@testing-library/react';
import { RunStatus } from '@patternfly/react-topology';
import PipelineStepList from '#~/concepts/topology/PipelineStepList';
import { AccessibleStep } from '#~/concepts/topology/accessibleSteps';
import { getStepLabelColor } from '#~/concepts/topology/stepLabels';

const mockSteps: AccessibleStep[] = [
  {
    id: 'step-1',
    label: 'build-image',
    status: RunStatus.Failed,
    statusLabel: 'Failed',
    sortIndex: 0,
  },
  {
    id: 'step-2',
    label: 'deploy',
    status: RunStatus.Succeeded,
    statusLabel: 'Succeeded',
    sortIndex: 1,
  },
];

describe('PipelineStepList', () => {
  it('renders an ordered list labelled by a visually hidden heading', () => {
    render(
      <PipelineStepList
        steps={mockSteps}
        headingId="steps-heading"
        headingText="Pipeline steps"
        onStepSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Pipeline steps' })).toHaveClass(
      'visually-hidden',
    );
    const list = screen.getByRole('list', { name: 'Pipeline steps' });
    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const failedStepButton = screen.getByTestId('pipeline-step-label-step-1');
    expect(failedStepButton).toHaveTextContent('build-image, Failed');
    expect(failedStepButton).toHaveTextContent('view details');
    expect(screen.getByRole('button', { name: 'build-image, Failed, view details' })).toBeVisible();
  });

  it('marks failure steps with data-failure for focus targeting', () => {
    render(
      <PipelineStepList
        steps={mockSteps}
        headingId="steps-heading"
        headingText="Pipeline steps"
        onStepSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('pipeline-step-label-step-1')).toHaveAttribute(
      'data-failure',
      'true',
    );
    expect(screen.getByTestId('pipeline-step-label-step-2')).not.toHaveAttribute('data-failure');
  });
});

describe('getStepLabelColor', () => {
  it('maps run statuses to label colors', () => {
    expect(getStepLabelColor(RunStatus.Failed)).toBe('red');
    expect(getStepLabelColor(RunStatus.Cancelled)).toBe('orange');
    expect(getStepLabelColor(RunStatus.Succeeded)).toBe('green');
  });
});
