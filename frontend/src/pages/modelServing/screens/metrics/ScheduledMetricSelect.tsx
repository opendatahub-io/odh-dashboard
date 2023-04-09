import React from 'react';
import { Select, SelectOption } from '@patternfly/react-core';

/*
Protected Attribute: input-3=1, Favorable Output: output-0=0
Protected Attribute: input-5=1, Favorable Output: output-0=0
Protected Attribute: input-5=1, Favorable Output: output-0=1

 */
export type TrustyMetaData = {
  protectedAttribute: string;
  protectedValue: number;
  favorableOutput: string;
  favorableValue: number;
};

type ScheduledMetricSelectProps = {
  metadata: TrustyMetaData[];
};
const ScheduledMetricSelect: React.FC<ScheduledMetricSelectProps> = ({ metadata }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>();

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (event, selection) => {
    console.log('select: %O', selection);
    setSelected(selection);
    setIsOpen(false);
    //showPayload(selection);
  };

  const formatOption = (option: TrustyMetaData) =>
    `Protected Attribute: ${option.protectedAttribute}=${option.protectedValue}, Favorable Output: ${option.favorableOutput}=${option.favorableValue}`;

  return (
    <Select onToggle={onToggle} isOpen={isOpen} onSelect={onSelect} selections={selected}>
      {metadata.map((payload, index) => (
        <SelectOption key={index} value={formatOption(payload)} />
      ))}
    </Select>
  );
};
export default ScheduledMetricSelect;
