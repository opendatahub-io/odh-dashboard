import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { TimeRangeControls, useTimeZoneParams } from '@perses-dev/plugin-system';

/**
 * Time range controls for the header
 * Must be inside PersesWrapper to access TimeRangeProvider context
 */
const HeaderTimeRangeControls: React.FC = () => {
  const { timeZone, setTimeZone } = useTimeZoneParams('local');
  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>Time period:</FlexItem>
      <FlexItem>
        <TimeRangeControls
          showTimeRangeSelector
          showRefreshButton
          showRefreshInterval={false}
          showCustomTimeRange
          showZoomButtons={false}
          timeZone={timeZone}
          onTimeZoneChange={(tz) => setTimeZone(tz.value)}
        />
      </FlexItem>
    </Flex>
  );
};

export default HeaderTimeRangeControls;
