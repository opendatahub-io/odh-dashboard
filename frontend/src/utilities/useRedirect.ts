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
 * Hook for managing redirects with loading states. Automatically redirects on mount.
 * @param createRedirectPath Function that creates the redirect path, can be async for data fetching
 * @param options Redirect options
 * @returns Redirect state object containing loading and error states
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { loaded, error } = useRedirect(() => '/foo');
 *
 * // With async path creation
 * const { loaded, error } = useRedirect(async () => {
 *   const data = await fetchData();
 *   return `/bar/${data.id}`;
 * });
 *
 * // With options
 * const { loaded, error } = useRedirect(() => '/foobar', {
 *   navigateOptions: { replace: true },
 *   onComplete: () => console.log('Redirected'),
 *   onError: (error) => console.error(error)
 * });
 *
 * // Usage in a component
 * const createRedirectPath = React.useCallback(() => '/some/path', []);
 *
 * const { loaded, error } = useRedirect(createRedirectPath);
 *
 * return (
 *   <ApplicationsPage
 *     loaded={loaded}
 *     empty={false}
 *     loadError={error}
 *     loadErrorPage={<RedirectErrorState
 *       title="Error redirecting"
 *       errorMessage={error?.message}
 *       actions={<Button onClick={() => navigate('/foo/bar')}>Go to Home</Button>}
 *     />}
 *   />
 * );
 * ```
 */
export const useRedirect = (
  createRedirectPath: () => string | Promise<string>,
  options: RedirectOptions = {},
): RedirectState => {
  const { navigateOptions, onComplete, onError } = options;
  const navigate = useNavigate();
  const [state, setState] = React.useState<RedirectState>({
    loaded: false,
    error: undefined,
  });

  React.useEffect(() => {
    const performRedirect = async () => {
      try {
        setState({ loaded: false, error: undefined });
        const path = await createRedirectPath();
        navigate(path, navigateOptions);
        setState({ loaded: true, error: undefined });
        onComplete?.();
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to redirect');
        setState({ loaded: true, error });
        onError?.(error);
      }
    };

    performRedirect();
  }, [createRedirectPath, navigate, navigateOptions, onComplete, onError]);

  return state;
};
