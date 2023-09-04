import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import './SimpleDropdownSelect.scss';

type SimpleDropdownProps = {
  options: {
    key: string;
    label: React.ReactNode;
    description?: React.ReactNode;
    selectedLabel?: React.ReactNode;
    isPlaceholder?: boolean;
  }[];
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
  const selectedLabel = selectedOption?.selectedLabel ?? selectedOption?.label ?? placeholder;

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
          {selectedLabel}
        </DropdownToggle>
      }
      dropdownItems={options
        .sort((a, b) => (a.isPlaceholder === b.isPlaceholder ? 0 : a.isPlaceholder ? -1 : 1))
        .map(({ key, label, description, isPlaceholder }) => (
          <DropdownItem
            key={key}
            description={description}
            onClick={() => {
              onChange(key, !!isPlaceholder);
              setOpen(false);
            }}
          >
            {isPlaceholder ? <i>{label}</i> : label}
          </DropdownItem>
        ))}
    />
  );
};

export default SimpleDropdownSelect;
