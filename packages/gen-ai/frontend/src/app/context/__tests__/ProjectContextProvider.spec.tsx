import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { ProjectContextProvider, useProjectContext } from '~/app/context/ProjectContext';
import * as userService from '~/app/services/userService';

jest.mock('~/app/services/userService', () => ({
  getCurrentUser: jest.fn(),
}));

describe('ProjectContextProvider', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides username from getCurrentUser on mount', async () => {
    (userService.getCurrentUser as jest.Mock).mockResolvedValue({ userId: 'alice' });

    const wrapper: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => (
      <ProjectContextProvider>{children}</ProjectContextProvider>
    );

    const { result } = renderHook(() => useProjectContext(), { wrapper });

    await waitFor(() => expect(result.current.username).toBe('alice'));
    expect(userService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('exposes safe defaults when used without provider', async () => {
    const { result } = renderHook(() => useProjectContext());
    expect(result.current.username).toBeUndefined();
    await expect(result.current.refreshUser()).resolves.toBeUndefined();
  });
});
