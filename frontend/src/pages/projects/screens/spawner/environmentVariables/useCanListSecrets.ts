import { useAccessReview } from '#~/api/useAccessReview';

/**
 * Lightweight hook that checks whether the current user has permission
 * to list secrets in the given namespace. Used to disable the "Existing
 * secret" radio before the user selects it.
 */
export const useCanListSecrets = (namespace: string): { canList: boolean; loaded: boolean } => {
  const [isAllowed, isAllowedLoaded] = useAccessReview({
    group: '',
    resource: 'secrets',
    verb: 'list',
    namespace,
  });

  return { canList: isAllowed, loaded: isAllowedLoaded };
};
