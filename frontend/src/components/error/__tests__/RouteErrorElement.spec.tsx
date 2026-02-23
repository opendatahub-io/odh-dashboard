import * as React from 'react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useRouteError } from 'react-router-dom';
import RouteErrorElement from '#~/components/error/RouteErrorElement';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteError: jest.fn(),
}));

const useRouteErrorMock = jest.mocked(useRouteError);

describe('RouteErrorElement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });
  });

  it('should render update state for ChunkLoadError and show details when requested', async () => {
    const error = new Error('Loading chunk 145 failed');
    error.name = 'ChunkLoadError';
    useRouteErrorMock.mockReturnValue(error);

    render(<RouteErrorElement />);

    expect(screen.getByTestId('error-update-state')).toBeInTheDocument();
    expect(screen.queryByTestId('router-error-boundary')).not.toBeInTheDocument();

    const showErrorButton = screen.getByTestId('show-error-button');
    act(() => showErrorButton.click());

    expect(screen.queryByTestId('error-update-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('router-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('ChunkLoadError')).toBeInTheDocument();
    expect(screen.getByText('Loading chunk 145 failed')).toBeInTheDocument();
  });

  it('should reset to update state when route error changes', () => {
    let currentError: unknown = Object.assign(new Error('Loading chunk 145 failed'), {
      name: 'ChunkLoadError',
    });
    useRouteErrorMock.mockImplementation(() => currentError);

    const { rerender } = render(<RouteErrorElement />);
    expect(screen.getByTestId('error-update-state')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('show-error-button').click();
    });
    expect(screen.getByTestId('router-error-boundary')).toBeInTheDocument();

    currentError = Object.assign(new Error('Loading chunk src_images_icons_Settings failed'), {
      name: 'ChunkLoadError',
    });
    rerender(<RouteErrorElement />);

    expect(screen.getByTestId('error-update-state')).toBeInTheDocument();
    expect(screen.queryByTestId('router-error-boundary')).not.toBeInTheDocument();
  });

  it('should render route error fallback for non-chunk errors', () => {
    useRouteErrorMock.mockReturnValue(new Error('regular route error'));

    render(<RouteErrorElement />);

    expect(screen.queryByTestId('error-update-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('router-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('regular route error')).toBeInTheDocument();
  });
});
