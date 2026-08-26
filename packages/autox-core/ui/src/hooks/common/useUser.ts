import { useContext, type Context } from 'react';
import type { UserSettings } from 'mod-arch-core';

/**
 * Creates a `useUser` hook bound to a product's own `AppContext` (kept product-local since each
 * product defines its own `React.Context` instance — only the read-the-user-off-context logic is
 * shared here).
 */
export function createUseUser<T extends { user: UserSettings }>(
  context: Context<T>,
): () => UserSettings {
  return function useUser(): UserSettings {
    const { user } = useContext(context);
    return user;
  };
}
