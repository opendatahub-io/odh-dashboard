import React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { AccessReviewContext } from '#~/concepts/userSSAR/AccessReviewContext';

/**
 * Check if the user has access to the provided resource attributes.
 * Consider using one of the other options.
 *   - <AccessAllowed /> for simple rendering blocks
 *   - useKebabAccessAllowed() for kebab options
 * If you still want to use this directly, consider using verbModelAccess for resourceAttributes.
 * @see AccessAllowed
 * @see useKebabAccessAllowed
 * @see verbModelAccess
 */
export const useAccessAllowed = (
  resourceAttributes: AccessReviewResourceAttributes,
  doCheck = true,
): [isAllowed: boolean, isLoaded: boolean] => {
  const { canIAccess, accessReviewCache, genKey } = React.useContext(AccessReviewContext);
  const { group, resource, subresource, verb, name, namespace } = resourceAttributes;

  React.useEffect(() => {
    if (doCheck) {
      canIAccess({ group, resource, subresource, verb, name, namespace });
    }
  }, [group, resource, subresource, verb, name, namespace, canIAccess, doCheck]);

  const accessCache = accessReviewCache[genKey(resourceAttributes)];

  if (!accessCache) {
    // Cache miss, not ready
    return [false, false];
  }

  return [accessCache.canAccess, !accessCache.isLoading];
};
