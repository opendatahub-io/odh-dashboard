import * as React from 'react';
import {
  Button,
  Select,
  SelectOption,
  Text,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import _ from 'lodash';
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
    <Toolbar>
      <ToolbarContent>
        {/*<ToolbarItem>*/}
        {/*  <Button variant="plain" onClick={refresh}>*/}
        {/*    <SyncAltIcon />*/}
        {/*  </Button>*/}
        {/*</ToolbarItem>*/}
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
            {Object.values(TimeframeTitle).map((value, index) => (
              <SelectOption key={index} value={value} />
            ))}
          </Select>
        </ToolbarItem>
        <ToolbarItem>
          <ToolbarItem variant="label">Refresh interval</ToolbarItem>
          <Select onToggle={_.noop}></Select>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default MetricsPageToolbar;
