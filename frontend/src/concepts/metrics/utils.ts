import { SelectOptionObject } from '@patternfly/react-core/deprecated';
import { TimeframeTitle, RefreshIntervalTitle } from '~/concepts/metrics/types';

export const isTimeframeTitle = (
  timeframe: string | SelectOptionObject,
): timeframe is TimeframeTitle =>
  Object.values(TimeframeTitle).includes(timeframe as TimeframeTitle);

export const isRefreshIntervalTitle = (
  refreshInterval: string | SelectOptionObject,
): refreshInterval is RefreshIntervalTitle =>
  Object.values(RefreshIntervalTitle).includes(refreshInterval as RefreshIntervalTitle);
