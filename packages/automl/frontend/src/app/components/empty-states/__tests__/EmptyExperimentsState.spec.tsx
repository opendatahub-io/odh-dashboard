import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmptyExperimentsState from '~/app/components/empty-states/EmptyExperimentsState';

describe('EmptyExperimentsState', () => {
  it('renders Empty State B', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState createExperimentRoute="/automl/create/my-namespace" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Create an AutoML optimization run' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Test different model configurations to find the best-performing solution for classification, regression, and time series problems.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-experiment-button')).toHaveTextContent('Create experiment');
  });

  it('should use default data-testid when not provided', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState createExperimentRoute="/automl/create/my-namespace" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('empty-experiments-state')).toBeInTheDocument();
  });

  it('should use custom data-testid when provided', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState
          createExperimentRoute="/automl/create/my-namespace"
          dataTestId="custom-empty-state"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-empty-state')).toBeInTheDocument();
  });

  it('should render link to create route', () => {
    render(
      <MemoryRouter>
        <EmptyExperimentsState createExperimentRoute="/automl/create/my-namespace" />
      </MemoryRouter>,
    );

    const createButton = screen.getByTestId('create-experiment-button');
    expect(createButton.closest('a')).toHaveAttribute('href', '/automl/create/my-namespace');
  });
});
