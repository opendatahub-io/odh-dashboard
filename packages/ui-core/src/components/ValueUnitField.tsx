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
import NumberInputWrapper from './NumberInputWrapper';
import { splitValueUnit, UnitOption, ValueUnitString } from '../utilities/valueUnits';
import { useMenuPopperInModal } from '../utilities/useMenuPopperInModal';

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
  const menuToggleRef = React.useRef<HTMLDivElement | null>(null);
  const [currentValue, currentUnitOption] = splitValueUnit(fullValue, options);
  const minAsNumber = typeof min === 'string' ? splitValueUnit(min, options)[0] : min;
  const maxAsNumber = typeof max === 'string' ? splitValueUnit(max, options)[0] : max;

  const userPopperProps = React.useMemo(
    () => (menuAppendTo !== undefined ? { appendTo: menuAppendTo } : undefined),
    [menuAppendTo],
  );
  const popperProps = useMenuPopperInModal(open, menuToggleRef, userPopperProps);

  return (
    <Split hasGutter>
      <SplitItem>
        <NumberInputWrapper
          min={minAsNumber}
          max={maxAsNumber}
          value={currentValue ?? ''}
          validated={validated}
          onBlur={
            onBlur &&
            ((value) => {
              onBlur(`${Number(value ?? minAsNumber)}${currentUnitOption.unit}`);
            })
          }
          onChange={(value) => {
            if (value === undefined) {
              onChange(`${''}${currentUnitOption.unit}`);
              return;
            }
            if (!Number.isNaN(value)) {
              if (
                (minAsNumber === undefined || Number(value) >= minAsNumber) &&
                (maxAsNumber === undefined || Number(value) <= maxAsNumber)
              ) {
                onChange(`${value}${currentUnitOption.unit}`);
              }
            }
          }}
          isDisabled={isDisabled}
          data-testid={dataTestId ? `${dataTestId}-input` : undefined}
        />
      </SplitItem>
      <SplitItem>
        <div ref={menuToggleRef} style={{ display: 'contents' }}>
          <Dropdown
            shouldFocusToggleOnSelect
            popperProps={popperProps}
            toggle={(toggleRef) => (
              <MenuToggle
                data-testid="value-unit-select"
                aria-label="Storage size unit"
                id="toggle-basic"
                ref={toggleRef}
                onClick={() => {
                  setOpen(!open);
                }}
                onKeyDown={(event) => {
                  if (open && event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                  }
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
        </div>
      </SplitItem>
    </Split>
  );
};

export default ValueUnitField;
