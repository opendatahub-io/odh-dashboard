import * as React from 'react';
import { Dropdown, DropdownItem, DropdownToggle, Tooltip } from '@patternfly/react-core';

type SimpleDropdownProps = {
  options: { key: string; label: React.ReactNode }[];
  value: string;
  placeholder?: string;
  showTooltipValue?: boolean;
  onChange: (key: string) => void;
} & Omit<React.ComponentProps<typeof Dropdown>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange'>;

const SimpleDropdownSelect: React.FC<SimpleDropdownProps> = ({
  onChange,
  options,
  placeholder = 'Select...',
  value,
  showTooltipValue,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const displayValue = options.find(({ key }) => key === value)?.label ?? placeholder;

  const component = (
    <Dropdown
      {...props}
      isOpen={open}
      toggle={
        <DropdownToggle onToggle={() => setOpen(!open)}>
          <>{displayValue}</>
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
  if (showTooltipValue) {
    return <Tooltip content={<div>{displayValue}</div>}>{component}</Tooltip>;
  }
  return component;
};

export default SimpleDropdownSelect;
