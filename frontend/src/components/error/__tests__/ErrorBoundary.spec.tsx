import * as React from 'react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '#~/components/error/ErrorBoundary';

class ChunkLoadError extends Error {
  name = 'ChunkLoadError';
}

describe('ErrorBoundary', () => {
  it('should handle regular error', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });

    let showError = true;
    const TestComponent = () => {
      if (showError) {
        throw new Error('regular error');
      }
      return <div data-testid="testing-123">testing</div>;
    };
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );
    await screen.findByTestId('error-boundary');
    await screen.findByText('regular error');

    // reload link
    const reloadButton = await screen.findByTestId('reload-link');
    act(() => reloadButton.click());
    expect(window.location.reload).toHaveBeenCalled();

    // close error
    showError = false;
    const closeButton = await screen.findByTestId('close-error-button');
    act(() => closeButton.click());
    expect(await screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    await screen.findByTestId('testing-123');
  });

  it('should handle ChunkLoadError', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });

    const ErrorComponent = () => {
      throw new ChunkLoadError('a chunk load error');
    };
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>,
    );
    await screen.findByTestId('error-update-state');
    expect(await screen.queryByTestId('error-boundary')).not.toBeInTheDocument();

    // reload button
    const reloadButton = await screen.findByTestId('reload-button');
    act(() => reloadButton.click());
    expect(window.location.reload).toHaveBeenCalled();

    // show error
    const showErrorButton = await screen.findByTestId('show-error-button');
    act(() => showErrorButton.click());
    expect(await screen.queryByTestId('error-update-state')).not.toBeInTheDocument();
    await screen.findByTestId('error-boundary');
    await screen.findByText('ChunkLoadError');
  });
});
