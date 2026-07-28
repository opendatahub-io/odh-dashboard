import * as React from 'react';
import { asEnumMember, enumIterator } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { MetricsCommonContext } from '#~/concepts/metrics/MetricsCommonContext';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import { isTimeframeTitle } from '#~/concepts/metrics/utils';

export const MetricsTimeRangeSelect: React.FC = () => {
  const { currentTimeframe, setCurrentTimeframe } = React.useContext(MetricsCommonContext);
  return (
    <SimpleSelect
      onChange={(selection) => {
        const value = asEnumMember(selection, TimeframeTitle);
        if (isTimeframeTitle(value)) {
          setCurrentTimeframe(value);
        }
      }}
      options={enumIterator(TimeframeTitle).map(
        ([, value]): SimpleSelectOption => ({
          key: value,
          label: value,
        }),
      )}
      value={currentTimeframe}
      toggleProps={{
        style: { width: '15ch' },
      }}
      data-testid="metrics-toolbar-time-range-select"
      popperProps={{ maxWidth: undefined }}
    />
  );
};
