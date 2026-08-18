import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { logout } from 'mod-arch-core';
import SessionExpiredModal from '~/app/SessionExpiredModal';

jest.mock('mod-arch-core', () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

const mockLogout = jest.mocked(logout);

describe('SessionExpiredModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with session expired message', () => {
    render(<SessionExpiredModal />);

    expect(screen.getByTestId('session-expired-modal')).toBeInTheDocument();
    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(
      screen.getByText('Your session timed out. To continue working, log in.'),
    ).toBeInTheDocument();
  });

  it('should render the login button', () => {
    render(<SessionExpiredModal />);

    const loginButton = screen.getByTestId('modal-login-button');
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveTextContent('Log in');
  });

  it('should call logout and reload when login button is clicked', async () => {
    const user = userEvent.setup();
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(<SessionExpiredModal />);

    await user.click(screen.getByTestId('modal-login-button'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
