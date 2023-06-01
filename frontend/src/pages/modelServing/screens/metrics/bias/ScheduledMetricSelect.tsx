import React from 'react';
import { Select, SelectOption } from '@patternfly/react-core';

type ScheduledMetricSelectProps = {
  selected?: string;
  options: string[];
  onSelect: (name: string) => void;
};
const ScheduledMetricSelect: React.FC<ScheduledMetricSelectProps> = ({
  selected,
  options,
  onSelect,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  return (
    <Select
      onToggle={() => setOpen(!isOpen)}
      isOpen={isOpen}
      onSelect={(event, selection) => {
        if (typeof selection === 'string') {
          onSelect(selection);
          setOpen(false);
        }
      }}
      selections={selected}
    >
      {options.map((value) => (
        <SelectOption key={value} value={value} />
      ))}
    </Select>
  );
};
export default ScheduledMetricSelect;
