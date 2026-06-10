import * as React from 'react';
import { TimeRangeControls, useTimeZoneParams } from '@perses-dev/plugin-system';

type PersesTimeControlsProps = {
  /** Show the time range selector dropdown (default: true) */
  showTimeRangeSelector?: boolean;
  /** Show the refresh button (default: true) */
  showRefreshButton?: boolean;
  /** Show the refresh interval dropdown (default: false) */
  showRefreshInterval?: boolean;
  /** Show the custom time range picker (default: true) */
  showCustomTimeRange?: boolean;
  /** Show zoom in/out buttons (default: false) */
  showZoomButtons?: boolean;
};

/**
 * Renders time range picker and refresh controls.
 * Must be rendered inside a PersesProvider.
 */
const PersesTimeControls: React.FC<PersesTimeControlsProps> = ({
  showTimeRangeSelector = true,
  showRefreshButton = true,
  showRefreshInterval = false,
  showCustomTimeRange = true,
  showZoomButtons = false,
}) => {
  const { timeZone, setTimeZone } = useTimeZoneParams('local');

  return (
    <TimeRangeControls
      showTimeRangeSelector={showTimeRangeSelector}
      showRefreshButton={showRefreshButton}
      showRefreshInterval={showRefreshInterval}
      showCustomTimeRange={showCustomTimeRange}
      showZoomButtons={showZoomButtons}
      timeZone={timeZone}
      onTimeZoneChange={(tz) => setTimeZone(tz.value)}
    />
  );
};

export default PersesTimeControls;
