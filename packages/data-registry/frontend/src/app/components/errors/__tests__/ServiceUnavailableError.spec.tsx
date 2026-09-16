import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceUnavailableError from '~/app/components/errors/ServiceUnavailableError';

describe('ServiceUnavailableError', () => {
  it('should render error message', () => {
    const onRetry = jest.fn();
    render(<ServiceUnavailableError onRetry={onRetry} />);

    expect(
      screen.getByText('Data Registry service is temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.getByText(/The Data Registry service is not responding/)).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ServiceUnavailableError onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
