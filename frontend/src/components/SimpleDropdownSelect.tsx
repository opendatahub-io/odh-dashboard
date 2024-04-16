import * as React from 'react';
import { Truncate, Dropdown, MenuToggle, DropdownList, DropdownItem } from '@patternfly/react-core';
import './SimpleDropdownSelect.scss';

export type SimpleDropdownOption = {
  key: string;
  label: string;
  description?: React.ReactNode;
  dropdownLabel?: React.ReactNode;
  isPlaceholder?: boolean;
};

type SimpleDropdownProps = {
  options: SimpleDropdownOption[];
  value: string;
  placeholder?: string;
  onChange: (key: string, isPlaceholder: boolean) => void;
  isFullWidth?: boolean;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  dataTestId?: string;
} & Omit<React.ComponentProps<typeof Dropdown>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange'>;

const SimpleDropdownSelect: React.FC<SimpleDropdownProps> = ({
  isDisabled,
  onChange,
  options,
  placeholder = 'Select...',
  value,
  isFullWidth,
  icon,
  dataTestId,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(({ key }) => key === value);
  const selectedLabel = selectedOption?.label ?? placeholder;

  return (
    <Dropdown
      {...props}
      isOpen={open}
      onSelect={() => setOpen(false)}
      onOpenChange={(isOpen: boolean) => setOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          data-testid={dataTestId}
          ref={toggleRef}
          isDisabled={isDisabled}
          icon={icon}
          isFullWidth={isFullWidth}
          onClick={() => setOpen(!open)}
          isExpanded={open}
        >
          <Truncate content={selectedLabel} className="truncate-no-min-width" />
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList>
        {[...options]
          .sort((a, b) => (a.isPlaceholder === b.isPlaceholder ? 0 : a.isPlaceholder ? -1 : 1))
          .map(({ key, dropdownLabel, label, description, isPlaceholder }) => (
            <DropdownItem
              data-testid={`dropdown-item ${key}`}
              key={key}
              description={description}
              onClick={() => {
                onChange(key, !!isPlaceholder);
                setOpen(false);
              }}
            >
              {dropdownLabel ?? label}
            </DropdownItem>
          ))}
      </DropdownList>
    </Dropdown>
  );
};

export default SimpleDropdownSelect;
