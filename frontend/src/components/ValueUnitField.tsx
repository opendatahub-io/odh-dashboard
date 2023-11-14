import * as React from 'react';
import { Split, SplitItem, ValidatedOptions } from '@patternfly/react-core';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core/deprecated';
import { splitValueUnit, UnitOption, ValueUnitString } from '~/utilities/valueUnits';
import NumberInputWrapper from './NumberInputWrapper';

type ValueUnitFieldProps = {
  /** @defaults to unlimited pos/neg */
  min?: number;
  /** @defaults to unlimited pos/neg */
  max?: number;
  onChange: (newValue: string) => void;
  options: UnitOption[];
  value: ValueUnitString;
  validated?: 'default' | 'error' | 'warning' | 'success' | ValidatedOptions | undefined;
};

const ValueUnitField: React.FC<ValueUnitFieldProps> = ({
  min,
  max,
  onChange,
  options,
  value: fullValue,
  validated,
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
          validated={validated}
          onChange={(value) => {
            onChange(`${value || min}${currentUnitOption.unit}`);
          }}
        />
      </SplitItem>
      <SplitItem>
        <Dropdown
          menuAppendTo="parent"
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
