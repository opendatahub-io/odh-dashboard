import * as React from 'react';
import {
  Split,
  SplitItem,
  ValidatedOptions,
  Dropdown,
  DropdownItem,
  MenuToggle,
  DropdownList,
} from '@patternfly/react-core';
import { splitValueUnit, UnitOption, ValueUnitString } from '#~/utilities/valueUnits';
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
  menuAppendTo?: HTMLElement;
  isDisabled?: boolean;
  dataTestId?: string;
};

const ValueUnitField: React.FC<ValueUnitFieldProps> = ({
  min,
  max,
  onChange,
  onBlur,
  options,
  menuAppendTo,
  value: fullValue,
  validated,
  isDisabled,
  dataTestId,
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
          value={Number(currentValue)}
          validated={validated}
          onBlur={
            onBlur &&
            ((value) => {
              onBlur(`${Number(value ?? minAsNumber)}${currentUnitOption.unit}`);
            })
          }
          onChange={(value) => {
            onChange(`${value ?? ''}${currentUnitOption.unit}`);
          }}
          isDisabled={isDisabled}
          data-testid={dataTestId ? `${dataTestId}-input` : undefined}
        />
      </SplitItem>
      <SplitItem>
        <Dropdown
          shouldFocusToggleOnSelect
          popperProps={{ appendTo: menuAppendTo }}
          toggle={(toggleRef) => (
            <MenuToggle
              data-testid="value-unit-select"
              aria-label="value unit field toggle"
              id="toggle-basic"
              ref={toggleRef}
              onClick={() => {
                setOpen(!open);
              }}
              isExpanded={open}
              isDisabled={isDisabled}
            >
              {currentUnitOption.name}
            </MenuToggle>
          )}
          isOpen={open}
          onOpenChange={(isOpened) => setOpen(isOpened)}
        >
          <DropdownList>
            {options.map((option) => (
              <DropdownItem
                key={option.unit}
                onClick={() => {
                  onChange(`${currentValue ?? ''}${option.unit}`);
                  setOpen(false);
                }}
              >
                {option.name}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </SplitItem>
    </Split>
  );
};

export default ValueUnitField;
