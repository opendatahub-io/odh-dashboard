import * as React from 'react';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import { RefreshIntervalTitle } from '~/concepts/metrics/types';
import { isRefreshIntervalTitle } from '~/concepts/metrics/utils';

export const MetricsRefreshIntervalSelect: React.FC = () => {
  const { currentRefreshInterval, setCurrentRefreshInterval } =
    React.useContext(MetricsCommonContext);
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Select
      isOpen={isOpen}
      onToggle={(e, expanded) => setIsOpen(expanded)}
      onSelect={(e, selection) => {
        if (isRefreshIntervalTitle(selection)) {
          setCurrentRefreshInterval(selection);
          setIsOpen(false);
        }
      }}
      selections={currentRefreshInterval}
      data-testid="metrics-toolbar-refresh-interval-select"
      toggleId="metrics-toolbar-refresh-interval-select-toggle"
    >
      {Object.values(RefreshIntervalTitle).map((value) => (
        <SelectOption key={value} value={value} />
      ))}
    </Select>
  );
};
