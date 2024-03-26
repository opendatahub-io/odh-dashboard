import * as React from 'react';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { isTimeframeTitle } from '~/concepts/metrics/utils';

export const MetricsTimeRangeSelect: React.FC = () => {
  const { currentTimeframe, setCurrentTimeframe } = React.useContext(MetricsCommonContext);
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Select
      isOpen={isOpen}
      onToggle={(e, expanded) => setIsOpen(expanded)}
      onSelect={(e, selection) => {
        if (isTimeframeTitle(selection)) {
          setCurrentTimeframe(selection);
          setIsOpen(false);
        }
      }}
      selections={currentTimeframe}
      data-testid="metrics-toolbar-time-range-select"
    >
      {Object.values(TimeframeTitle).map((value) => (
        <SelectOption key={value} value={value} />
      ))}
    </Select>
  );
};
