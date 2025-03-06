import React from 'react';
import { useLocation } from 'react-router-dom';
import { checkAccess } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import useNamespaces from '~/pages/notebookController/useNamespaces';

type AccessReviewCacheData = {
  isLoading: boolean;
  canAccess: boolean;
};

type AccessReviewCacheType = Record<
  /** Key */
  string,
  AccessReviewCacheData | undefined
>;

type RouteAccessReviewCacheType = Record<
  /** Route location */
  string,
  AccessReviewCacheType
>;

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

const useRoutePart = (): string => {
  const { pathname } = useLocation();
  // We only care about the first part of the route `/foobar`; "foobar" string
  return pathname.split('/')[1] ?? '';
};

/** Top level route changes, we set the cache to empty */
const useClearCacheOnPathChange = (resetFunc: (routeToReset: string) => void) => {
  const routePart = useRoutePart();
  const ref = React.useRef<string>(routePart);

  React.useEffect(() => {
    if (ref.current !== routePart) {
      // eslint-disable-next-line no-console
      console.log('New page, clearing access route checks');
      resetFunc(ref.current);
      ref.current = routePart;
    }
  }, [routePart, resetFunc]);
};

export const AccessReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessReviewCache, setAccessReviewCache] = React.useState<RouteAccessReviewCacheType>({});
  const routePart = useRoutePart();
  const keysRef = React.useRef(new Set());
  useClearCacheOnPathChange(
    React.useCallback((routeToReset) => {
      setAccessReviewCache((data) => {
        const rest = { ...data };
        delete rest[routeToReset];
        return rest;
      });
      keysRef.current.clear();
    }, []),
  );
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

      if (keysRef.current.has(key)) {
        // Key is in cache, no need to fetch
        return;
      }

      keysRef.current.add(key);
      setAccessReviewCache((oldValue) => ({
        ...oldValue,
        [routePart]: {
          ...oldValue[routePart],
          [key]: {
            isLoading: true,
            canAccess: false,
          } satisfies AccessReviewCacheData,
        },
      }));

      // Determine access
      return checkAccess({ group, resource, subresource, verb, name, namespace }).then(
        (allowed) => {
          console.debug('<<<<<< returned', verb, allowed);
          setAccessReviewCache((oldValue) => ({
            ...oldValue,
            [routePart]: {
              ...oldValue[routePart],
              [key]: {
                isLoading: false,
                canAccess: allowed,
              } satisfies AccessReviewCacheData,
            },
          }));
        },
      );
    },
    [routePart, dashboardNamespace, genKey],
  );

  const contextObject = React.useMemo(
    () =>
      ({
        canIAccess,
        accessReviewCache: accessReviewCache[routePart] ?? {},
        genKey,
      } satisfies AccessReviewContextType),
    [canIAccess, accessReviewCache, routePart, genKey],
  );

  return (
    <AccessReviewContext.Provider value={contextObject}>{children}</AccessReviewContext.Provider>
  );
};
