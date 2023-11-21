import * as React from 'react';
import { Button, Text, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { SyncAltIcon } from '@patternfly/react-icons';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import { relativeTime } from '~/utilities/time';
import { isTimeframeTitle } from './utils';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';

const MetricsPageToolbar: React.FC = () => {
  const [timeframeOpen, setTimeframeOpen] = React.useState(false);
  const { currentTimeframe, setCurrentTimeframe, refresh, lastUpdateTime } = React.useContext(
    ModelServingMetricsContext,
  );
  return (
    <Toolbar style={{ paddingBottom: 0 }}>
      <ToolbarContent>
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
            {Object.values(TimeframeTitle).map((value, index) => (
              <SelectOption key={index} value={value} />
            ))}
          </Select>
        </ToolbarItem>
        <ToolbarItem>
          <Button variant="plain" onClick={refresh}>
            <SyncAltIcon />
          </Button>
        </ToolbarItem>
        <ToolbarItem align={{ default: 'alignRight' }}>
          <Text component="small">Last update</Text>
          <br />
          <Text component="small">{relativeTime(Date.now(), lastUpdateTime)}</Text>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
