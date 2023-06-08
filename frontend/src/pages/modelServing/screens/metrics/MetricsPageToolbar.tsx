import * as React from 'react';
import { Select, SelectOption, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
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
    <Toolbar>
      <ToolbarContent>
        {leftToolbarItem && leftToolbarItem}
        <ToolbarItem alignment={{ default: 'alignRight' }}>
          <ToolbarItem variant="label">Time range</ToolbarItem>
          <Select
            isOpen={timeframeOpen}
            onToggle={(expanded) => setTimeframeOpen(expanded)}
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
        <ToolbarItem>
          <ToolbarItem variant="label">Refresh interval</ToolbarItem>
          <Select
            isOpen={intervalOpen}
            onToggle={(expanded) => setIntervalOpen(expanded)}
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
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
