import React from 'react';
import { useLocation } from 'react-router-dom';
import { checkAccess } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import useNamespaces from '~/pages/notebookController/useNamespaces';

type AccessReviewCacheData = {
  isLoading: boolean;
  canAccess: boolean;
};

type AccessReviewCacheType = Record<string, AccessReviewCacheData | undefined>;

type AccessReviewContextType = {
  canIAccess: (resourceAttributes: AccessReviewResourceAttributes) => void;
  accessReviewCache: AccessReviewCacheType;
  genKey: (resourceAttributes: AccessReviewResourceAttributes) => string;
};

export const AccessReviewContext = React.createContext<AccessReviewContextType>({
  canIAccess: () => undefined,
  accessReviewCache: {},
  genKey: () => '',
});

/** Top level route changes, we set the cache to empty */
const useClearCacheOnPathChange = (setAccessReviewCache: (data: AccessReviewCacheType) => void) => {
  const { pathname } = useLocation();
  const ref = React.useRef<string>(pathname.split('/')[0]);

  React.useEffect(() => {
    const root = pathname.split('/')[0];
    if (ref.current !== root) {
      // eslint-disable-next-line no-console
      console.log('New page, clearing access route checks');
      setAccessReviewCache({});
    }
  }, [pathname, setAccessReviewCache]);
};

export const AccessReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessReviewCache, setAccessReviewCache] = React.useState<AccessReviewCacheType>({});
  useClearCacheOnPathChange(setAccessReviewCache);
  // If namespace is not provided in the data, assume it means the dashboard deployment namespace
  const { dashboardNamespace } = useNamespaces();

  const genKey = React.useCallback(
    (resourceAttributes: AccessReviewResourceAttributes): string =>
      [
        resourceAttributes.verb,
        resourceAttributes.group,
        resourceAttributes.resource,
        resourceAttributes.namespace || dashboardNamespace,
        // Possible additional information, not likely applicable in most cases
        resourceAttributes.name || 'na',
        resourceAttributes.subresource || 'na',
      ].join('~'),
    [dashboardNamespace],
  );

  const canIAccess = React.useCallback(
    (resourceAttributes: AccessReviewResourceAttributes) => {
      const attrs = {
        ...resourceAttributes,
        namespace: resourceAttributes.namespace || dashboardNamespace,
      };

      const key = genKey(attrs);
      const { group = '', resource = '', subresource = '', verb, name = '', namespace } = attrs;

      if (key in accessReviewCache) {
        // Key is in cache, no need to fetch
        return;
      }

      // Temporarily set loading state
      setAccessReviewCache((oldValue) => ({
        ...oldValue,
        [key]: {
          isLoading: true,
          canAccess: false,
        } satisfies AccessReviewCacheData,
      }));

      // Determine access
      return checkAccess({ group, resource, subresource, verb, name, namespace }).then(
        (allowed) => {
          setAccessReviewCache((oldValue) => ({
            ...oldValue,
            [key]: {
              isLoading: false,
              canAccess: allowed,
            } satisfies AccessReviewCacheData,
          }));
        },
      );
    },
    [accessReviewCache, dashboardNamespace, genKey],
  );

  const contextObject = React.useMemo(
    () =>
      ({
        canIAccess,
        accessReviewCache,
        genKey,
      } satisfies AccessReviewContextType),
    [genKey, accessReviewCache, canIAccess],
  );

  return (
    <AccessReviewContext.Provider value={contextObject}>{children}</AccessReviewContext.Provider>
  );
};
