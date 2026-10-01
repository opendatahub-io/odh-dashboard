import * as React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { HostApiCoreContext } from '../HostApiCoreContext';

export type AccessReviewState =
  | { state: 'loading' | 'allowed' | 'denied' }
  | { state: 'error'; error: Error };

/** Fail closed, including when attributes change or a host lacks the strict contract. */
export const useAccessReviewState = (
  attributes: AccessReviewResourceAttributes,
  enabled = true,
): AccessReviewState => {
  const { reviewAccess } = React.useContext(HostApiCoreContext);
  const {
    group = '',
    resource = '',
    subresource = '',
    verb,
    name = '',
    namespace = '',
  } = attributes;
  const request = React.useMemo(
    () => ({ attributes: { group, resource, subresource, verb, name, namespace }, enabled }),
    [group, resource, subresource, verb, name, namespace, enabled],
  );
  const [result, setResult] = React.useState<{
    request: typeof request;
    reviewAccess: typeof reviewAccess;
    value: AccessReviewState;
  }>();

  React.useEffect(() => {
    const controller = new AbortController();
    if (enabled) {
      Promise.resolve()
        .then(() => {
          if (!reviewAccess) {
            throw new Error('Access reviews are not available in this host.');
          }
          return reviewAccess(request.attributes, { signal: controller.signal });
        })
        .then(
          (allowed) => {
            if (!controller.signal.aborted) {
              setResult({
                request,
                reviewAccess,
                value: { state: allowed === true ? 'allowed' : 'denied' },
              });
            }
          },
          (error: unknown) => {
            if (!controller.signal.aborted) {
              setResult({
                request,
                reviewAccess,
                value: {
                  state: 'error',
                  error: error instanceof Error ? error : new Error('Access review failed.'),
                },
              });
            }
          },
        );
    }
    return () => controller.abort();
  }, [enabled, request, reviewAccess]);

  if (!enabled) {
    return { state: 'denied' };
  }
  return result?.request === request && result.reviewAccess === reviewAccess
    ? result.value
    : { state: 'loading' };
};
