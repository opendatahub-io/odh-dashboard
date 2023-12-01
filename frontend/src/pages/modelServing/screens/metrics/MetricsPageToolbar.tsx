import * as React from 'react';
import {
  Select,
  SelectOption,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
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
        <ToolbarGroup alignment={{ default: 'alignRight' }}>
          <ToolbarGroup>
            <Stack>
              <StackItem>
                <ToolbarItem variant="label">Time range</ToolbarItem>
              </StackItem>
              <StackItem>
                <Select
                  isOpen={timeframeOpen}
                  onOpenChange={(expanded) => setTimeframeOpen(expanded)}
                  onSelect={(e, selection) => {
                    if (isTimeframeTitle(selection)) {
                      setCurrentTimeframe(selection);
                      setTimeframeOpen(false);
                    }
                  }}
                  selected={currentTimeframe}
                >
                  {Object.values(TimeframeTitle).map((value) => (
                    <SelectOption key={value} value={value} />
                  ))}
                </Select>
              </StackItem>
            </Stack>
          </ToolbarGroup>
          <ToolbarGroup>
            <Stack>
              <StackItem>
                <ToolbarItem variant="label">Refresh interval</ToolbarItem>
              </StackItem>
              <StackItem>
                <Select
                  isOpen={intervalOpen}
                  onOpenChange={(expanded) => setIntervalOpen(expanded)}
                  onSelect={(e, selection) => {
                    if (isRefreshIntervalTitle(selection)) {
                      setCurrentRefreshInterval(selection);
                      setIntervalOpen(false);
                    }
                  }}
                  selected={currentRefreshInterval}
                >
                  {Object.values(RefreshIntervalTitle).map((value) => (
                    <SelectOption key={value} value={value} />
                  ))}
                </Select>
              </StackItem>
            </Stack>
          </ToolbarGroup>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
