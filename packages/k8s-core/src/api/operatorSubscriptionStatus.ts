export type OperatorSubscriptionStatus = {
  channel?: string;
  installedCSV?: string;
  installPlanRefNamespace?: string;
  lastUpdated?: string;
};

const OPERATOR_SUBSCRIPTION_STATUS_PATH = '/api/operator-subscription-status';

const isOperatorSubscriptionStatus = (value: unknown): value is OperatorSubscriptionStatus =>
  typeof value === 'object' &&
  value !== null &&
  'channel' in value &&
  typeof value.channel === 'string';

/** Fetches the installed data science operator subscription status from a Core BFF. */
export const fetchOperatorSubscriptionStatus = async (
  hostPath = '',
  options?: RequestInit,
): Promise<OperatorSubscriptionStatus> => {
  const response = await fetch(`${hostPath}${OPERATOR_SUBSCRIPTION_STATUS_PATH}`, options);
  if (!response.ok) {
    throw new Error(`Unable to load operator subscription status (${response.status})`);
  }

  const body: unknown = await response.json();
  if (!isOperatorSubscriptionStatus(body)) {
    throw new Error('Invalid operator subscription status response');
  }
  return body;
};
