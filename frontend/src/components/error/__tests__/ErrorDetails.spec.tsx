import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ErrorDetails from '#~/components/error/ErrorDetails';

describe('ErrorDetails', () => {
  it('should render description, component trace, and stack trace', () => {
    render(
      <ErrorDetails
        title="ChunkLoadError"
        errorMessage="Loading chunk 145 failed"
        componentStack={'\n at App\n at NavSidebar'}
        stack={'ChunkLoadError: Loading chunk 145 failed\n at __webpack_require__'}
      />,
    );

    expect(screen.getByText('ChunkLoadError')).toBeInTheDocument();
    expect(screen.getByText('Description:')).toBeInTheDocument();
    expect(screen.getByText('Loading chunk 145 failed')).toBeInTheDocument();
    expect(screen.getByText('Component trace:')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/at App\s+at NavSidebar/)).toBeInTheDocument();
    expect(screen.getByText('Stack trace:')).toBeInTheDocument();
  });

  it('should omit component trace when componentStack is not provided', () => {
    render(<ErrorDetails title="Route error" errorMessage="Unknown route error" />);

    expect(screen.getByText('Route error')).toBeInTheDocument();
    expect(screen.getByText('Unknown route error')).toBeInTheDocument();
    expect(screen.queryByText('Component trace:')).not.toBeInTheDocument();
  });
});
