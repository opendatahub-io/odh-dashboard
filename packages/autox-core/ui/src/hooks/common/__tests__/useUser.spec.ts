import * as React from 'react';
import { renderHook } from '@testing-library/react';
import type { UserSettings } from 'mod-arch-core';
import { createUseUser } from '../useUser';

type TestAppContextProps = {
  config: { foo: string };
  user: UserSettings;
};

describe('createUseUser', () => {
  it('should return the user from the given context', () => {
    const mockUser = { userId: 'test-user' } as unknown as UserSettings;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const TestAppContext = React.createContext({} as TestAppContextProps);
    const useUser = createUseUser(TestAppContext);

    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) =>
        React.createElement(
          TestAppContext.Provider,
          { value: { config: { foo: 'bar' }, user: mockUser } },
          children,
        ),
    });

    expect(result.current).toBe(mockUser);
  });

  it('should return the context default when no provider wraps the hook', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const TestAppContext = React.createContext({} as TestAppContextProps);
    const useUser = createUseUser(TestAppContext);

    const { result } = renderHook(() => useUser());

    expect(result.current).toBeUndefined();
  });

  it('should create independent hooks for different contexts', () => {
    const mockUserA = { userId: 'user-a' } as unknown as UserSettings;
    const mockUserB = { userId: 'user-b' } as unknown as UserSettings;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const ContextA = React.createContext({} as TestAppContextProps);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const ContextB = React.createContext({} as TestAppContextProps);
    const useUserA = createUseUser(ContextA);
    const useUserB = createUseUser(ContextB);

    const { result: resultA } = renderHook(() => useUserA(), {
      wrapper: ({ children }) =>
        React.createElement(
          ContextA.Provider,
          { value: { config: { foo: 'a' }, user: mockUserA } },
          children,
        ),
    });
    const { result: resultB } = renderHook(() => useUserB(), {
      wrapper: ({ children }) =>
        React.createElement(
          ContextB.Provider,
          { value: { config: { foo: 'b' }, user: mockUserB } },
          children,
        ),
    });

    expect(resultA.current).toBe(mockUserA);
    expect(resultB.current).toBe(mockUserB);
  });
});
