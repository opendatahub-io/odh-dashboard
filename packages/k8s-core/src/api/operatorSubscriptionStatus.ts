export type OperatorSubscriptionStatus = {
  channel?: string;
  installedCSV?: string;
  installPlanRefNamespace?: string;
  lastUpdated?: string;
};

const OPERATOR_SUBSCRIPTION_STATUS_PATH = '/api/operator-subscription-status';

/** Fetches the installed data science operator subscription status from the dashboard API. */
export const fetchOperatorSubscriptionStatus = async (
  hostPath = '',
  options?: RequestInit,
): Promise<OperatorSubscriptionStatus> => {
  const response = await fetch(`${hostPath}${OPERATOR_SUBSCRIPTION_STATUS_PATH}`, options);
  if (!response.ok) {
    let message: string | undefined;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string' &&
        body.message.trim()
      ) {
        message = body.message;
      }
    } catch {
      // Fall back to the status message when the error body is not JSON.
    }
    throw new Error(message ?? `Unable to load operator subscription status (${response.status})`);
  }

  const body: OperatorSubscriptionStatus = await response.json();
  return body;
};
