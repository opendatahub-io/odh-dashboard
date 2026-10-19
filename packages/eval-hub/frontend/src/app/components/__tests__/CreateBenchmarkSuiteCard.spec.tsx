import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';

describe('CreateBenchmarkSuiteCard', () => {
  it('should render the suite creation CTA content', () => {
    render(<CreateBenchmarkSuiteCard />);

    expect(screen.getByTestId('create-suite-card')).toHaveTextContent('Create your own collection');
    expect(screen.getByText(/Build a reusable collection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create collection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import from git' })).not.toBeInTheDocument();
  });

  it('should invoke the supplied CTA callback', () => {
    const onCreateSuite = jest.fn();
    render(<CreateBenchmarkSuiteCard onCreateSuite={onCreateSuite} />);

    fireEvent.click(screen.getByTestId('create-suite-button'));

    expect(onCreateSuite).toHaveBeenCalledTimes(1);
  });

  it('should link to the suite creation route when provided', () => {
    render(
      <MemoryRouter>
        <CreateBenchmarkSuiteCard createSuiteRoute="/evaluation/evalhub/create/collections/new" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Create collection' })).toHaveAttribute(
      'href',
      '/evaluation/evalhub/create/collections/new',
    );
  });
});
