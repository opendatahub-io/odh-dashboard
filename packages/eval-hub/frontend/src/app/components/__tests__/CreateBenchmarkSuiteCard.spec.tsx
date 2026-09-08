import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';

describe('CreateBenchmarkSuiteCard', () => {
  it('should render the suite creation CTA content', () => {
    render(<CreateBenchmarkSuiteCard />);

    expect(screen.getByTestId('create-suite-card')).toHaveTextContent('Create your own suite');
    expect(screen.getByText(/Build a reusable evaluation suite/)).toBeInTheDocument();
    expect(screen.getByTestId('create-suite-button')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import from git' })).not.toBeInTheDocument();
  });

  it('should invoke the supplied CTA callback', () => {
    const onCreateSuite = jest.fn();
    render(<CreateBenchmarkSuiteCard onCreateSuite={onCreateSuite} />);

    fireEvent.click(screen.getByTestId('create-suite-button'));

    expect(onCreateSuite).toHaveBeenCalledTimes(1);
  });
});
