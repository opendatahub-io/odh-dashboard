import React from 'react';
import { checkAccess } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import useNamespaces from '~/pages/notebookController/useNamespaces';

type AccessReviewCacheThingType = {
  isLoading: boolean;
  canAccess: boolean;
};

type AccessReviewCacheType = Record<string, AccessReviewCacheThingType | undefined>;

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

export const AccessReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessReviewCache, setAccessReviewCache] = React.useState<AccessReviewCacheType>({});
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
        },
      }));

      // Determine access
      return checkAccess({ group, resource, subresource, verb, name, namespace }).then(
        ([allowed, loaded]) => {
          setAccessReviewCache((oldValue) => ({
            ...oldValue,
            [key]: {
              isLoading: !loaded,
              canAccess: allowed,
            },
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
