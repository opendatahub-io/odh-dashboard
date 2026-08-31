import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProviderLandingPage from '~/odh/openshell/ProviderLandingPage';
import { useOpenShellConnection } from '~/odh/openshell/OpenShellConnection';

jest.mock('~/odh/openshell/OpenShellConnection', () => ({
  useOpenShellConnection: jest.fn(),
}));

const mockUseOpenShellConnection = jest.mocked(useOpenShellConnection);

describe('ProviderLandingPage', () => {
  const connect = jest.fn();

  beforeEach(() => {
    connect.mockReset();
  });

  it('shows only the connected identity when OpenShell is connected', () => {
    mockUseOpenShellConnection.mockReturnValue({
      state: { status: 'connected', username: 'gkrumbac', error: null },
      connect,
      disconnect: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProviderLandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Connected as gkrumbac')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.queryByText('Built in')).not.toBeInTheDocument();
    expect(screen.queryByText('Separate sign-in')).not.toBeInTheDocument();
  });

  it('shows an actionable disconnected state', () => {
    mockUseOpenShellConnection.mockReturnValue({
      state: { status: 'disconnected', username: null, error: null },
      connect,
      disconnect: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProviderLandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Not connected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
