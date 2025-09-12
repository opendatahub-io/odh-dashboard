import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { UserContextProvider, useUserContext } from '~/app/context/UserContext';
import * as userService from '~/app/services/userService';

jest.mock('~/app/services/userService', () => ({
  getCurrentUser: jest.fn(),
}));

describe('UserContextProvider', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides username from getCurrentUser on mount', async () => {
    (userService.getCurrentUser as jest.Mock).mockResolvedValue({ userId: 'alice' });

    const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
      <UserContextProvider>{children}</UserContextProvider>
    );

    const { result } = renderHook(() => useUserContext(), { wrapper });

    await waitFor(() => expect(result.current.username).toBe('alice'));
    expect(userService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('exposes safe defaults when used without provider', async () => {
    const { result } = renderHook(() => useUserContext());
    expect(result.current.username).toBeUndefined();
    await expect(result.current.refreshUser()).resolves.toBeUndefined();
  });
});
