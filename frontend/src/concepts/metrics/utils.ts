import { TimeframeTitle, RefreshIntervalTitle } from '#~/concepts/metrics/types';
import { isEnumMember } from '#~/utilities/utils';

export const isTimeframeTitle = (timeframe?: string | null): timeframe is TimeframeTitle =>
  isEnumMember(timeframe, TimeframeTitle);

export const isRefreshIntervalTitle = (
  refreshInterval?: string | null,
): refreshInterval is RefreshIntervalTitle => isEnumMember(refreshInterval, RefreshIntervalTitle);
