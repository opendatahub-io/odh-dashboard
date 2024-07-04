import * as React from 'react';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { isTimeframeTitle } from '~/concepts/metrics/utils';
import { asEnumMember, enumIterator } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';

export const MetricsTimeRangeSelect: React.FC = () => {
  const { currentTimeframe, setCurrentTimeframe } = React.useContext(MetricsCommonContext);
  return (
    <SimpleSelect
      onSelect={(_ev, selection) => {
        const value = asEnumMember(selection, TimeframeTitle);
        if (isTimeframeTitle(value)) {
          setCurrentTimeframe(value);
        }
      }}
      options={enumIterator(TimeframeTitle).map(([, value]) => ({
        key: value,
        children: value,
      }))}
      toggleLabel={currentTimeframe}
      data-testid="metrics-toolbar-time-range-select"
    />
  );
};
