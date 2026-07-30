import * as React from 'react';
import { asEnumMember, enumIterator } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { RefreshIntervalTitle } from '@odh-dashboard/ui-core/types/metrics';
import { MetricsCommonContext } from '#~/concepts/metrics/MetricsCommonContext';
import { isRefreshIntervalTitle } from '#~/concepts/metrics/utils';

export const MetricsRefreshIntervalSelect: React.FC = () => {
  const { currentRefreshInterval, setCurrentRefreshInterval } =
    React.useContext(MetricsCommonContext);

  return (
    <SimpleSelect
      value={currentRefreshInterval}
      onChange={(selection) => {
        const value = asEnumMember(selection, RefreshIntervalTitle);
        if (isRefreshIntervalTitle(value)) {
          setCurrentRefreshInterval(value);
        }
      }}
      options={enumIterator(RefreshIntervalTitle).map(
        ([, value]): SimpleSelectOption => ({
          key: value,
          label: value,
        }),
      )}
      toggleProps={{
        id: 'metrics-toolbar-refresh-interval-select-toggle',
        style: { width: '15ch' },
      }}
      data-testid="metrics-toolbar-refresh-interval-select"
      popperProps={{ maxWidth: undefined }}
    />
  );
};
