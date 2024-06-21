import { SelectOptionObject } from '@patternfly/react-core/deprecated';
import { TimeframeTitle, RefreshIntervalTitle } from '~/concepts/metrics/types';
import { isEnumMember } from '~/utilities/utils';

export const isTimeframeTitle = (
  timeframe: string | SelectOptionObject,
): timeframe is TimeframeTitle => isEnumMember(timeframe.toString(), TimeframeTitle);

export const isRefreshIntervalTitle = (
  refreshInterval: string | SelectOptionObject,
): refreshInterval is RefreshIntervalTitle =>
  isEnumMember(refreshInterval.toString(), RefreshIntervalTitle);
