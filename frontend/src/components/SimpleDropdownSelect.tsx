import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';

type SimpleDropdownProps = {
  options: { key: string; label: React.ReactNode }[];
  value: string;
  placeholder?: string;
  onChange: (key: string) => void;
} & Omit<React.ComponentProps<typeof Dropdown>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange'>;

const SimpleDropdownSelect: React.FC<SimpleDropdownProps> = ({
  onChange,
  options,
  placeholder = 'Select...',
  value,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dropdown
      {...props}
      isOpen={open}
      toggle={
        <DropdownToggle onToggle={() => setOpen(!open)}>
          <>{options.find(({ key }) => key === value)?.label ?? placeholder}</>
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
