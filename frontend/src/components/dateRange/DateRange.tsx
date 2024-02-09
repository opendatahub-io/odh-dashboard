import * as React from 'react';
import { DatePicker, Split, SplitItem } from '@patternfly/react-core';
import { DateRangeString, makeDateRange, splitDateRange } from '~/components/dateRange/utils';

type DateRangeProps = {
  value: DateRangeString;
  onChange: (stringDate: DateRangeString) => void;
};

const DateRange: React.FC<DateRangeProps> = ({ value, onChange }) => {
  const [startDate, endDate] = splitDateRange(value);

  const handleChange = (startingDate: boolean, dateValue: string) => {
    if (startingDate) {
      onChange(makeDateRange(dateValue, endDate));
    } else {
      onChange(makeDateRange(startDate, dateValue));
    }
  };

  return (
    <Split>
      <SplitItem>
        <DatePicker
          placeholder="Start date"
          value={startDate ?? undefined}
          onChange={(e, newValue) => handleChange(true, newValue)}
        />
      </SplitItem>
      <SplitItem>
        <DatePicker
          placeholder="End date"
          value={endDate ?? undefined}
          onChange={(e, newValue) => handleChange(false, newValue)}
        />
      </SplitItem>
    </Split>
  );
};

export default DateRange;
