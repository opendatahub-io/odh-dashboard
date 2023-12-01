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
            <Stack hasGutter style={{ gap: 'var(--pf-v5-global--spacer--sm)' }}>
              <StackItem>
                <ToolbarItem variant="label">Time range</ToolbarItem>
              </StackItem>
              <StackItem>
                <Select
                  isOpen={timeframeOpen}
                  onToggle={(_event, expanded) => setTimeframeOpen(expanded)}
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
              </StackItem>
            </Stack>
          </ToolbarGroup>
          <ToolbarGroup>
            <Stack hasGutter style={{ gap: 'var(--pf-v5-global--spacer--sm)' }}>
              <StackItem>
                <ToolbarItem variant="label">Refresh interval</ToolbarItem>
              </StackItem>
              <StackItem>
                <Select
                  isOpen={intervalOpen}
                  onToggle={(_event, expanded) => setIntervalOpen(expanded)}
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
              </StackItem>
            </Stack>
          </ToolbarGroup>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
