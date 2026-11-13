import * as React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { HostApiCoreContext } from '../HostApiCoreContext';

/**
 * Non-cached access review for the current host and resource attributes.
 * Returns [allowed, loaded]. Pending and disabled checks deny access; failed
 * checks settle as denied. Results from superseded requests are discarded.
 */
export const useAccessReview = (
  resourceAttributes: AccessReviewResourceAttributes,
  shouldRunCheck = true,
): [boolean, boolean] => {
  const { checkAccess } = React.useContext(HostApiCoreContext);
  const {
    group = '',
    resource = '',
    subresource = '',
    verb,
    name = '',
    namespace = '',
  } = resourceAttributes;

  const request = React.useMemo(
    () => ({
      checkAccess,
      shouldRunCheck,
      attributes: { group, resource, subresource, verb, name, namespace },
    }),
    [checkAccess, shouldRunCheck, group, resource, subresource, verb, name, namespace],
  );
  const [result, setResult] = React.useState<{
    request: typeof request;
    allowed: boolean;
  }>();

  React.useEffect(() => {
    if (!request.shouldRunCheck) {
      return undefined;
    }
    let active = true;
    const review = async () => {
      let allowed = false;
      try {
        allowed = (await request.checkAccess(request.attributes)) === true;
      } catch {
        // Missing host services and failed reviews never grant permission.
      }
      if (active) {
        setResult({ request, allowed });
      }
    };
    void review();
    return () => {
      active = false;
    };
  }, [request]);

  return request.shouldRunCheck && result?.request === request
    ? [result.allowed, true]
    : [false, false];
};
