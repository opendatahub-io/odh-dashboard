import * as React from 'react';
import {
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { MetricsTimeRangeSelect } from '#~/concepts/metrics/MetricsTimeRangeSelect';
import { MetricsRefreshIntervalSelect } from '#~/concepts/metrics/MetricsRefreshIntervalSelect';

type MetricsPageToolbarProps = {
  leftToolbarItem?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
  hasTimeRangeSelect?: boolean;
};

const MetricsPageToolbar: React.FC<MetricsPageToolbarProps> = ({
  leftToolbarItem,
  hasTimeRangeSelect = true,
}) => (
  <Toolbar isSticky inset={{ default: 'insetLg' }}>
    <ToolbarContent>
      {leftToolbarItem}
      <ToolbarGroup align={{ default: 'alignEnd' }}>
        {hasTimeRangeSelect && (
          <ToolbarGroup>
            <Stack>
              {/* Will be fixed by https://issues.redhat.com/browse/RHOAIENG-2403 */}
              <StackItem style={{ fontWeight: 'bold' }}>Time range</StackItem>
              <StackItem>
                <ToolbarItem>
                  <MetricsTimeRangeSelect />
                </ToolbarItem>
              </StackItem>
            </Stack>
          </ToolbarGroup>
        )}
        <ToolbarGroup>
          <Stack>
            {/* Will be fixed by https://issues.redhat.com/browse/RHOAIENG-2403 */}
            <StackItem style={{ fontWeight: 'bold' }}>Refresh interval</StackItem>
            <StackItem>
              <ToolbarItem>
                <MetricsRefreshIntervalSelect />
              </ToolbarItem>
            </StackItem>
          </Stack>
        </ToolbarGroup>
      </ToolbarGroup>
    </ToolbarContent>
  </Toolbar>
);

export default MetricsPageToolbar;
