import * as React from 'react';
import { asEnumMember, enumIterator } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from './SimpleSelect';
import { TimeframeTitle } from '../types/metrics';
import { MetricsCommonContext } from '../contexts/MetricsCommonContext';
import { isTimeframeTitle } from '../utilities/metrics';

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
