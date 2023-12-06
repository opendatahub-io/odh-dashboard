import * as React from 'react';
import {
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { RefreshIntervalTitle, TimeframeTitle } from '~/pages/modelServing/screens/types';
import { isRefreshIntervalTitle, isTimeframeTitle } from './utils';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';

type MetricsPageToolbarProps = {
  leftToolbarItem?: React.ReactElement<typeof ToolbarItem>;
};

const MetricsPageToolbar: React.FC<MetricsPageToolbarProps> = ({ leftToolbarItem }) => {
  const [timeframeOpen, setTimeframeOpen] = React.useState(false);
  const {
    currentTimeframe,
    setCurrentTimeframe,
    currentRefreshInterval,
    setCurrentRefreshInterval,
  } = React.useContext(ModelServingMetricsContext);

  const [intervalOpen, setIntervalOpen] = React.useState(false);

  return (
    <Toolbar isSticky>
      <ToolbarContent>
        {leftToolbarItem}
        <ToolbarGroup align={{ default: 'alignRight' }}>
          <ToolbarGroup>
            <Stack>
              {/* Will be fixed by https://github.com/opendatahub-io/odh-dashboard/issues/2277 */}
              <StackItem style={{ fontWeight: 'bold' }}>Time range</StackItem>
              <StackItem>
                <ToolbarItem>
                  <Select
                    isOpen={timeframeOpen}
                    onToggle={(e, expanded) => setTimeframeOpen(expanded)}
                    onSelect={(e, selection) => {
                      if (isTimeframeTitle(selection)) {
                        setCurrentTimeframe(selection);
                        setTimeframeOpen(false);
                      }
                    }}
                    selections={currentTimeframe}
                  >
                    {Object.values(TimeframeTitle).map((value) => (
                      <SelectOption key={value} value={value} />
                    ))}
                  </Select>
                </ToolbarItem>
              </StackItem>
            </Stack>
          </ToolbarGroup>
          <ToolbarGroup>
            <Stack>
              {/* Will be fixed by https://github.com/opendatahub-io/odh-dashboard/issues/2277 */}
              <StackItem style={{ fontWeight: 'bold ' }}>Refresh interval</StackItem>
              <StackItem>
                <ToolbarItem>
                  <Select
                    isOpen={intervalOpen}
                    onToggle={(e, expanded) => setIntervalOpen(expanded)}
                    onSelect={(e, selection) => {
                      if (isRefreshIntervalTitle(selection)) {
                        setCurrentRefreshInterval(selection);
                        setIntervalOpen(false);
                      }
                    }}
                    selections={currentRefreshInterval}
                  >
                    {Object.values(RefreshIntervalTitle).map((value) => (
                      <SelectOption key={value} value={value} />
                    ))}
                  </Select>
                </ToolbarItem>
              </StackItem>
            </Stack>
          </ToolbarGroup>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
