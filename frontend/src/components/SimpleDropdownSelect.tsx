import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle, Truncate } from '@patternfly/react-core';
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
  width?: number;
} & Omit<React.ComponentProps<typeof Dropdown>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange'>;

const SimpleDropdownSelect: React.FC<SimpleDropdownProps> = ({
  onChange,
  options,
  placeholder = 'Select...',
  value,
  isFullWidth,
  isDisabled,
  width,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(({ key }) => key === value);
  const selectedLabel = selectedOption?.label ?? placeholder;

  return (
    <Dropdown
      {...props}
      isOpen={open}
      className={isFullWidth ? 'full-width' : undefined}
      toggle={
        <DropdownToggle
          isDisabled={isDisabled}
          className={isFullWidth ? 'full-width' : undefined}
          onToggle={() => setOpen(!open)}
          style={{ width }}
        >
          <Truncate content={selectedLabel} className="truncate-no-min-width" />
        </DropdownToggle>
      }
      dropdownItems={[...options]
        .sort((a, b) => (a.isPlaceholder === b.isPlaceholder ? 0 : a.isPlaceholder ? -1 : 1))
        .map(({ key, dropdownLabel, label, description, isPlaceholder }) => (
          <DropdownItem
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
    />
  );
};

export default SimpleDropdownSelect;
