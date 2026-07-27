import * as React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { HostApiContext } from '../HostApiContext';

/**
 * Used for a non-cached SSAR request.
 *
 * Potentially obsolete -- depending on if we need a non-cached variant.
 *
 * @see useAccessAllowed - Cached variant
 * @see verbModelAccess - Helper util for resourceAttributes
 */
export const useAccessReview = (
  resourceAttributes: AccessReviewResourceAttributes,
  shouldRunCheck = true,
): [boolean, boolean] => {
  const { checkAccess } = React.useContext(HostApiContext);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAllowed, setAllowed] = React.useState(false);

  const {
    group = '',
    resource = '',
    subresource = '',
    verb,
    name = '',
    namespace = '',
  } = resourceAttributes;

  React.useEffect(() => {
    if (shouldRunCheck) {
      checkAccess({ group, resource, subresource, verb, name, namespace }).then((allowed) => {
        setAllowed(allowed);
        setIsLoaded(true);
      });
    }
  }, [checkAccess, group, name, namespace, resource, subresource, verb, shouldRunCheck]);

  return [isAllowed, isLoaded];
};
