import * as React from 'react';
import { Split, SplitItem, ValidatedOptions } from '@patternfly/react-core';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core/deprecated';
import { splitValueUnit, UnitOption, ValueUnitString } from '~/utilities/valueUnits';
import NumberInputWrapper from './NumberInputWrapper';

type ValueUnitFieldProps = {
  /**
   * @defaults to unlimited pos/neg
   * number: simple check before reconverting to unit
   * string: "I have an existing unit value that I don't want to under"
   */
  min?: number | string;
  /**
   * @defaults to unlimited pos/neg
   * number: simple check before reconverting to unit
   * string: "I have an existing unit value that I don't want to under"
   */
  max?: number | string;
  onChange: (newValue: string) => void;
  onBlur?: (blurValue: string) => void;
  options: UnitOption[];
  value: ValueUnitString;
  validated?: 'default' | 'error' | 'warning' | 'success' | ValidatedOptions | undefined;
};

const ValueUnitField: React.FC<ValueUnitFieldProps> = ({
  min,
  max,
  onChange,
  onBlur,
  options,
  value: fullValue,
  validated,
}) => {
  const [open, setOpen] = React.useState(false);
  const [currentValue, currentUnitOption] = splitValueUnit(fullValue, options);
  const minAsNumber = typeof min === 'string' ? splitValueUnit(min, options)[0] : min;
  const maxAsNumber = typeof max === 'string' ? splitValueUnit(max, options)[0] : max;

  return (
    <Split hasGutter>
      <SplitItem>
        <NumberInputWrapper
          min={minAsNumber}
          max={maxAsNumber}
          value={currentValue}
          validated={validated}
          onBlur={
            onBlur &&
            ((value) => {
              onBlur(`${Math.max(value || minAsNumber)}${currentUnitOption.unit}`);
            })
          }
          onChange={(value) => {
            onChange(`${value || minAsNumber}${currentUnitOption.unit}`);
          }}
        />
      </SplitItem>
      <SplitItem>
        <Dropdown
          data-testid="value-unit-select"
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
