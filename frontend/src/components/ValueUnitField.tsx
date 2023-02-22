import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle, Split, SplitItem } from '@patternfly/react-core';
import NumberInputWrapper from './NumberInputWrapper';
import { splitValueUnit, UnitOption, ValueUnitString } from '../utilities/valueUnits';

type ValueUnitFieldProps = {
  /** @defaults to unlimited pos/neg */
  min?: number;
  /** @defaults to unlimited pos/neg */
  max?: number;
  onChange: (newValue: string) => void;
  options: UnitOption[];
  value: ValueUnitString;
};

const ValueUnitField: React.FC<ValueUnitFieldProps> = ({
  min,
  max,
  onChange,
  options,
  value: fullValue,
}) => {
  const [open, setOpen] = React.useState(false);
  const [currentValue, currentUnitOption] = splitValueUnit(fullValue, options);

  return (
    <Split hasGutter>
      <SplitItem>
        <NumberInputWrapper
          min={min}
          max={max}
          value={currentValue}
          onChange={(value) => {
            onChange(`${value || min}${currentUnitOption.unit}`);
          }}
        />
      </SplitItem>
      <SplitItem>
        <Dropdown
          toggle={
            <DropdownToggle id="toggle-basic" onToggle={() => setOpen(!open)}>
              {currentUnitOption.name}
            </DropdownToggle>
          }
          isOpen={open}
          dropdownItems={options.map((option) => (
            <DropdownItem
              key={option.unit}
              onClick={() => {
                onChange(`${currentValue}${option.unit}`);
                setOpen(false);
              }}
            >
              {option.name}
            </DropdownItem>
          ))}
        />
      </SplitItem>
    </Split>
  );
};

export default ValueUnitField;
