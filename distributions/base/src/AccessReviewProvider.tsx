import React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';

type AccessReviewCache = Record<string, boolean | undefined>;

type AccessReviewContextValue = {
  cache: AccessReviewCache;
  check: (attributes: AccessReviewResourceAttributes) => void;
};

const AccessReviewContext = React.createContext<AccessReviewContextValue>({
  cache: {},
  check: () => undefined,
});

const keyFor = (attributes: AccessReviewResourceAttributes): string =>
  [
    attributes.group,
    attributes.resource,
    attributes.subresource,
    attributes.verb,
    attributes.name,
    attributes.namespace,
  ].join('~');

const requiredAttributes = (
  attributes: AccessReviewResourceAttributes,
): Required<AccessReviewResourceAttributes> => ({
  group: attributes.group ?? '',
  resource: attributes.resource ?? '',
  subresource: attributes.subresource ?? '',
  verb: attributes.verb,
  name: attributes.name ?? '',
  namespace: attributes.namespace ?? '',
});

const isAccessReview = (value: unknown): value is AccessReviewResourceAttributes => {
  if (typeof value !== 'object' || value === null || !('verb' in value)) {
    return false;
  }
  const { verb } = value;
  return (
    typeof verb === 'string' &&
    [
      '*',
      'create',
      'get',
      'list',
      'update',
      'patch',
      'delete',
      'deletecollection',
      'watch',
    ].includes(verb)
  );
};

export const AccessReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAccess } = useHostApiCore();
  const [cache, setCache] = React.useState<AccessReviewCache>({});
  const pending = React.useRef(new Set<string>());

  const check = React.useCallback(
    (attributes: AccessReviewResourceAttributes) => {
      const key = keyFor(attributes);
      if (cache[key] !== undefined || pending.current.has(key)) {
        return;
      }
      pending.current.add(key);
      void checkAccess(requiredAttributes(attributes))
        .catch(() => false)
        .then((allowed) => {
          pending.current.delete(key);
          setCache((current) => ({ ...current, [key]: allowed }));
        });
    },
    [cache, checkAccess],
  );

  const value = React.useMemo(() => ({ cache, check }), [cache, check]);

  return <AccessReviewContext.Provider value={value}>{children}</AccessReviewContext.Provider>;
};

export const useAccessReviewExtensions = <T extends { properties: object }>(
  extensions: T[],
): [T[], boolean] => {
  const { cache, check } = React.useContext(AccessReviewContext);
  const getAccessReview = React.useCallback(
    (extension: T): AccessReviewResourceAttributes | undefined => {
      const accessReview = Object.entries(extension.properties).find(
        ([key]) => key === 'accessReview',
      )?.[1];
      if (isAccessReview(accessReview)) {
        return accessReview;
      }
      return undefined;
    },
    [],
  );

  React.useEffect(() => {
    extensions.forEach((extension) => {
      const accessReview = getAccessReview(extension);
      if (accessReview) {
        check(accessReview);
      }
    });
  }, [check, extensions, getAccessReview]);

  const reviewed = extensions.filter((extension) => getAccessReview(extension));
  const loaded = reviewed.every((extension) => {
    const accessReview = getAccessReview(extension);
    return accessReview ? cache[keyFor(accessReview)] !== undefined : true;
  });
  const allowed = extensions.filter((extension) => {
    const accessReview = getAccessReview(extension);
    return !accessReview || cache[keyFor(accessReview)] === true;
  });

  return [allowed, loaded];
};
