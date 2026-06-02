import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { buildMockExperimentKF } from '#~/__mocks__/mockExperimentKF';
import { ExperimentFilterSelector } from '#~/concepts/pipelines/content/pipelineSelector/CustomPipelineRunToolbarSelect';

jest.useFakeTimers();

/* eslint-disable camelcase */
const mockExperiments: ExperimentKF[] = [
  buildMockExperimentKF({ experiment_id: '1', display_name: 'Experiment A' }),
  buildMockExperimentKF({ experiment_id: '2', display_name: 'Experiment B' }),
  buildMockExperimentKF({ experiment_id: '3', display_name: 'Experiment C' }),
];
/* eslint-enable camelcase */

describe('ExperimentFilterSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render the toggle enabled when resources exist', () => {
    render(
      <ExperimentFilterSelector
        resources={mockExperiments}
        selection={undefined}
        onSelect={jest.fn()}
      />,
    );

    const toggle = screen.getByTestId('run-group-toggle-button');
    expect(toggle).not.toBeDisabled();
  });

  it('should render the toggle disabled when no resources exist', () => {
    render(<ExperimentFilterSelector resources={[]} selection={undefined} onSelect={jest.fn()} />);

    const toggle = screen.getByTestId('run-group-toggle-button');
    expect(toggle).toBeDisabled();
  });

  it('should keep toggle enabled after searching for a non-existent name', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <ExperimentFilterSelector
        resources={mockExperiments}
        selection={undefined}
        onSelect={jest.fn()}
      />,
    );

    const toggle = screen.getByTestId('run-group-toggle-button');

    // Open the dropdown
    await user.click(toggle);

    // Type a search that matches nothing
    const searchInput = screen.getByLabelText('Filter pipeline run groups');
    await user.type(searchInput, 'nonexistent');

    // Advance timers to flush the debounced search
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // The toggle should still be enabled even though no results match
    expect(toggle).not.toBeDisabled();
  });

  it('should clear search when dropdown closes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <ExperimentFilterSelector
        resources={mockExperiments}
        selection={undefined}
        onSelect={jest.fn()}
      />,
    );

    const toggle = screen.getByTestId('run-group-toggle-button');

    // Open the dropdown
    await user.click(toggle);

    // Type a search
    const searchInput = screen.getByLabelText('Filter pipeline run groups');
    await user.type(searchInput, 'nonexistent');

    // Advance timers to flush debounce
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Close by clicking toggle again
    await user.click(toggle);

    // Reopen
    await user.click(toggle);

    // Search should be cleared - the helper text should reflect all resources
    expect(
      screen.getByText(`Type a name to search your ${mockExperiments.length} run groups.`),
    ).toBeInTheDocument();
  });
});
