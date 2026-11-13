import { checkAccess as checkResourceAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import type { HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';

/** Review the caller's permissions through the host's configured Kubernetes transport. */
export const checkAccess: HostApiCoreServices['checkAccess'] = (attributes) =>
  checkResourceAccess(attributes, { failureMode: 'reject' });
