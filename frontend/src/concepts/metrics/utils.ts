import { isEnumMember } from '@odh-dashboard/foundation';
import { TimeframeTitle, RefreshIntervalTitle } from '#~/concepts/metrics/types';

export const isTimeframeTitle = (timeframe?: string | null): timeframe is TimeframeTitle =>
  isEnumMember(timeframe, TimeframeTitle);

export const isRefreshIntervalTitle = (
  refreshInterval?: string | null,
): refreshInterval is RefreshIntervalTitle => isEnumMember(refreshInterval, RefreshIntervalTitle);
