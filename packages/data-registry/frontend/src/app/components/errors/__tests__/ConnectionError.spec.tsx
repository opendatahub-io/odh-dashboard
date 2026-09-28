import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionError from '~/app/components/errors/ConnectionError';

describe('ConnectionError', () => {
  it('should render connection error message', () => {
    const onRetry = jest.fn();
    render(<ConnectionError onRetry={onRetry} />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the Data Registry service/)).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ConnectionError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
