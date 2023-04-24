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

  const onToggle = () => setOpen(!isOpen);
  const onSelectValue = (event, selection) => {
    onSelect(selection);
    setOpen(false);
  };

  return (
    <Select onToggle={onToggle} isOpen={isOpen} onSelect={onSelectValue} selections={selected}>
      {options.map((value) => (
        <SelectOption key={value} value={value} />
      ))}
    </Select>
  );
};
export default ScheduledMetricSelect;
