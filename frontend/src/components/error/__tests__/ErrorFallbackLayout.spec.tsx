import * as React from 'react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ErrorFallbackLayout from '#~/components/error/ErrorFallbackLayout';

describe('ErrorFallbackLayout', () => {
  it('should reload the page when reload link is clicked', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });

    render(<ErrorFallbackLayout />);

    const reloadButton = screen.getByTestId('reload-link');
    act(() => reloadButton.click());

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should render and handle close button when onClose is provided', () => {
    const onClose = jest.fn();

    render(
      <ErrorFallbackLayout onClose={onClose}>
        <div>details</div>
      </ErrorFallbackLayout>,
    );

    expect(screen.getByText('details')).toBeInTheDocument();
    const closeButton = screen.getByTestId('close-error-button');
    act(() => closeButton.click());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when onClose is not provided', () => {
    render(<ErrorFallbackLayout />);

    expect(screen.queryByTestId('close-error-button')).not.toBeInTheDocument();
  });
});
