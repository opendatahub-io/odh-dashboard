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
import BiasMetricConfigSelector from '~/pages/modelServing/screens/metrics/bias/BiasMetricConfigSelector';
import { isTimeframeTitle } from './utils';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';

type MetricsPageToolbarProps = {
  leftToolbarItem?: React.ReactElement<typeof ToolbarItem>;
};

const MetricsPageToolbar: React.FC<MetricsPageToolbarProps> = ({ leftToolbarItem }) => {
  const [timeframeOpen, setTimeframeOpen] = React.useState(false);
  const { currentTimeframe, setCurrentTimeframe } = React.useContext(ModelServingMetricsContext);
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
            {Object.values(TimeframeTitle).map((value, index) => (
              <SelectOption key={value} value={value} />
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
