import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmptyExperimentsState from '../EmptyExperimentsState';

describe('EmptyExperimentsState', () => {
  it('renders Empty State B', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState
          createExperimentRoute="/automl/create/my-namespace"
          title="Create an AutoML optimization run"
          description="Test different model configurations to find the best-performing solution."
          iconImage="icon.svg"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Create an AutoML optimization run' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Test different model configurations to find the best-performing solution.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-run-button')).toHaveTextContent('Create run');
  });

  it('should use default data-testid when not provided', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState
          createExperimentRoute="/automl/create/my-namespace"
          title="title"
          description="description"
          iconImage="icon.svg"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('empty-experiments-state')).toBeInTheDocument();
  });

  it('should use custom data-testid when provided', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState
          createExperimentRoute="/automl/create/my-namespace"
          title="title"
          description="description"
          iconImage="icon.svg"
          dataTestId="custom-empty-state"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-empty-state')).toBeInTheDocument();
  });

  it('should render link to create route', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState
          createExperimentRoute="/automl/create/my-namespace"
          title="title"
          description="description"
          iconImage="icon.svg"
        />
      </MemoryRouter>,
    );

    const createButton = screen.getByTestId('create-run-button');
    expect(createButton.closest('a')).toHaveAttribute('href', '/automl/create/my-namespace');
  });
});
