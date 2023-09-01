import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';

type SimpleDropdownProps = {
  isDisabled?: boolean;
  options: { key: string; label: React.ReactNode }[];
  value: string;
  placeholder?: string;
  onChange: (key: string) => void;
  width?: number;
} & Omit<React.ComponentProps<typeof Dropdown>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange'>;

const SimpleDropdownSelect: React.FC<SimpleDropdownProps> = ({
  isDisabled,
  onChange,
  options,
  placeholder = 'Select...',
  value,
  width,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const displayValue = options.find(({ key }) => key === value)?.label ?? placeholder;

  return (
    <Dropdown
      {...props}
      isOpen={open}
      toggle={
        <DropdownToggle isDisabled={isDisabled} onToggle={() => setOpen(!open)} style={{ width }}>
          {displayValue}
        </DropdownToggle>
      }
      dropdownItems={options.map(({ key, label }) => (
        <DropdownItem
          key={key}
          onClick={() => {
            onChange(key);
            setOpen(false);
          }}
        >
          {label}
        </DropdownItem>
      ))}
    />
  );
};

export default SimpleDropdownSelect;
