import * as React from 'react';
import { Truncate, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { MenuToggleProps } from '@patternfly/react-core/src/components/MenuToggle/MenuToggle';

import './SimpleSelect.scss';

export type SimpleSelectOption = {
  key: string;
  label: string;
  description?: React.ReactNode;
  dropdownLabel?: React.ReactNode;
  isPlaceholder?: boolean;
  isDisabled?: boolean;
};

type SimpleSelectProps = {
  options: SimpleSelectOption[];
  value?: string;
  toggleLabel?: React.ReactNode;
  placeholder?: string;
  onChange: (key: string, isPlaceholder: boolean) => void;
  isFullWidth?: boolean;
  toggleProps?: MenuToggleProps;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  dataTestId?: string;
} & Omit<
  React.ComponentProps<typeof Select>,
  'isOpen' | 'toggle' | 'dropdownItems' | 'onChange' | 'selected'
>;

const SimpleSelect: React.FC<SimpleSelectProps> = ({
  isDisabled,
  onChange,
  options,
  placeholder = 'Select...',
  value,
  toggleLabel,
  isFullWidth,
  icon,
  dataTestId,
  toggleProps,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(({ key }) => key === value);
  const selectedLabel = selectedOption?.label ?? placeholder;

  return (
    <Select
      {...props}
      isOpen={open}
      selected={value || toggleLabel}
      onSelect={(e, selectValue) => {
        onChange(
          String(selectValue),
          options.find((o) => o.key === selectValue)?.isPlaceholder ?? false,
        );
        setOpen(false);
      }}
      onOpenChange={setOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          data-testid={dataTestId}
          aria-label="Options menu"
          onClick={() => setOpen(!open)}
          icon={icon}
          isExpanded={open}
          isDisabled={isDisabled}
          isFullWidth={isFullWidth}
          {...toggleProps}
        >
          {toggleLabel || <Truncate content={selectedLabel} className="truncate-no-min-width" />}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <SelectList>
        {options.map(({ key, label, dropdownLabel, description, isDisabled: optionDisabled }) => (
          <SelectOption
            key={key}
            value={key}
            description={description}
            isDisabled={optionDisabled}
            data-testid={key}
          >
            {dropdownLabel || label}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default SimpleSelect;
