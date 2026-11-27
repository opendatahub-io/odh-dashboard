import { checkAccess as checkResourceAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import type { HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';

/** Review the caller's permissions through the host's configured Kubernetes transport. */
export const checkAccess: HostApiCoreServices['checkAccess'] = async (attributes) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Kubernetes access review timed out.', 'TimeoutError')),
    30_000,
  );
  try {
    return await checkResourceAccess(attributes, {
      failureMode: 'reject',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};
