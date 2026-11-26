import * as React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { HostApiCoreContext } from '../HostApiCoreContext';

/**
 * Non-cached access review for the current host and resource attributes.
 * Pending and disabled checks deny access. Failed checks retain the transport error.
 * Results from superseded requests are discarded.
 */
export const useAccessReviewResult = (
  resourceAttributes: AccessReviewResourceAttributes,
  shouldRunCheck = true,
): { allowed: boolean; loaded: boolean; error?: Error } => {
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
    error?: Error;
  }>();

  React.useEffect(() => {
    if (!request.shouldRunCheck) {
      return undefined;
    }
    let active = true;
    const review = async () => {
      try {
        const allowed = (await request.checkAccess(request.attributes)) === true;
        if (active) {
          setResult({ request, allowed });
        }
      } catch (error) {
        if (active) {
          setResult({
            request,
            allowed: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };
    void review();
    return () => {
      active = false;
    };
  }, [request]);

  return request.shouldRunCheck && result?.request === request
    ? { allowed: result.allowed, loaded: true, error: result.error }
    : { allowed: false, loaded: false, error: undefined };
};

export const useAccessReview = (
  resourceAttributes: AccessReviewResourceAttributes,
  shouldRunCheck = true,
): [boolean, boolean] => {
  const { allowed, loaded } = useAccessReviewResult(resourceAttributes, shouldRunCheck);
  return [allowed, loaded];
};
