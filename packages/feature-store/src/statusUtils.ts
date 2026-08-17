type ConditionLike = { status?: string; reason?: string; message?: string };

const FAILURE_PATTERN = /fail|error|crashloop/i;

export const isConditionFailed = (c: ConditionLike): boolean =>
  c.status !== 'True' &&
  ((typeof c.reason === 'string' && FAILURE_PATTERN.test(c.reason)) ||
    (typeof c.message === 'string' && FAILURE_PATTERN.test(c.message)));

export const hasConditionFailure = (conditions?: ConditionLike[]): boolean =>
  Array.isArray(conditions) && conditions.some(isConditionFailed);

export const humanizeConditionType = (type: string): string => {
  const known: Record<string, string> = {
    OnlineStore: 'Online store',
    OfflineStore: 'Offline store',
    FeatureStore: 'Feature store',
    CronJob: 'Cron job',
  };
  return known[type] ?? type.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export type ConditionDisplay = {
  label: 'Complete' | 'Failed' | 'Pending';
  color: 'green' | 'red' | 'purple';
};

export const resolveConditionDisplay = (c: ConditionLike): ConditionDisplay => {
  if (c.status === 'True') {
    return { label: 'Complete', color: 'green' };
  }
  if (isConditionFailed(c)) {
    return { label: 'Failed', color: 'red' };
  }
  return { label: 'Pending', color: 'purple' };
};
