import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { isK8sStatus, K8sStatusError } from '@odh-dashboard/k8s-core';

type K8sFailureStatus = K8sStatus & {
  details?: { causes: { reason: string; message: string }[] };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

/**
 * Turns any 4xx/5xx answer from the K8s pass-through into an error, so callers never mistake a
 * failed request for a successful one:
 * - a Kubernetes Status body is used as-is;
 * - any other JSON error body (an error raised by the dashboard backend) is wrapped in a
 *   synthesized Status so `statusObject.code` still reflects the HTTP status;
 * - a non-JSON or empty body (a router error page, an unmocked request) becomes a plain Error,
 *   because it carries no Kubernetes semantics and must not be treated as a resource-level 404.
 */
export const toK8sFetchError = (
  httpStatus: number,
  statusText: string,
  body: string,
): K8sStatusError | Error => {
  const data = parseBody(body);
  if (isK8sStatus(data)) {
    return new K8sStatusError(data);
  }
  const fallbackMessage = statusText || `Request failed with status ${httpStatus}`;
  if (!isRecord(data)) {
    return new Error(fallbackMessage);
  }
  const message = typeof data.message === 'string' && data.message ? data.message : fallbackMessage;
  const cause =
    typeof data.code === 'string'
      ? data.code
      : typeof data.error === 'string'
      ? data.error
      : undefined;
  const status: K8sFailureStatus = {
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    code: httpStatus,
    reason: 'DashboardProxyError',
    message,
    ...(cause ? { details: { causes: [{ reason: cause, message }] } } : {}),
  };
  return new K8sStatusError(status);
};
