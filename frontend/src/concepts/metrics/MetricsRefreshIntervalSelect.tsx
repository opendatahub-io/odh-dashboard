import * as React from 'react';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import { RefreshIntervalTitle } from '~/concepts/metrics/types';
import { isRefreshIntervalTitle } from '~/concepts/metrics/utils';
import SimpleSelect from '~/components/SimpleSelect';
import { asEnumMember, enumIterator } from '~/utilities/utils';

export const MetricsRefreshIntervalSelect: React.FC = () => {
  const { currentRefreshInterval, setCurrentRefreshInterval } =
    React.useContext(MetricsCommonContext);

  return (
    <SimpleSelect
      onSelect={(_ev, selection) => {
        const value = asEnumMember(selection, RefreshIntervalTitle);
        if (isRefreshIntervalTitle(value)) {
          setCurrentRefreshInterval(value);
        }
      }}
      options={enumIterator(RefreshIntervalTitle).map(([, value]) => ({
        key: value,
        children: value,
      }))}
      toggleLabel={currentRefreshInterval}
      toggleId="metrics-toolbar-refresh-interval-select-toggle"
      data-testid="metrics-toolbar-refresh-interval-select"
    />
  );
};
