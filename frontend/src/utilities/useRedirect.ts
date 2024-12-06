import { NavigateOptions, useNavigate } from 'react-router-dom';
import React from 'react';

export type RedirectState = {
  loaded: boolean;
  error?: Error;
};

export type RedirectOptions = {
  /** Additional options for the navigate function */
  navigateOptions?: NavigateOptions;
  /** Callback when redirect is complete */
  onComplete?: () => void;
  /** Callback when redirect fails */
  onError?: (error: Error) => void;
};

/**
 * Hook for managing redirects with loading states
 * @param createRedirectPath Function that creates the redirect path, can be async for data fetching
 * @param options Redirect options
 * @returns Array of [redirect function, redirect state]
 */
export const useRedirect = (
  createRedirectPath: () => string | Promise<string | undefined> | undefined,
  options: RedirectOptions = {},
): [(notFoundOnError?: boolean) => Promise<void>, RedirectState] => {
  const { navigateOptions, onComplete, onError } = options;

  const navigate = useNavigate();
  const [state, setState] = React.useState<RedirectState>({
    loaded: false,
    error: undefined,
  });

  const redirect = React.useCallback(
    async (notFoundOnError = true) => {
      try {
        const path = await createRedirectPath();
        if (!path) {
          throw new Error('No redirect path available');
        }
        navigate(path, navigateOptions);
        setState({ loaded: true, error: undefined });
        onComplete?.();
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to redirect');
        setState({ loaded: true, error });
        onError?.(error);
        if (notFoundOnError) {
          navigate('/not-found', { replace: true });
        }
      }
    },
    [createRedirectPath, navigate, navigateOptions, onComplete, onError],
  );

  return [redirect, state];
};
