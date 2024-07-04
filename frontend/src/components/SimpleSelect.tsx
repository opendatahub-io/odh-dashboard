import * as React from 'react';
import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';

type SimpleSelectOption = {
  key: string;
  children: React.ReactNode;
  description?: React.ReactNode;
};

type SimpleSelectProps = {
  toggleLabel: React.ReactNode;
  toggleId?: string;
  onSelect: (event?: React.MouseEvent<Element, MouseEvent>, value?: string | number) => void;
  isFullWidth?: boolean;
  options: SimpleSelectOption[];
  isDisabled?: boolean;
  selected?: string;
  dataTestId?: string;
  style?: React.CSSProperties;
} & Omit<
  React.ComponentProps<typeof Select>,
  'isOpen' | 'toggle' | 'onOpenChange' | 'shouldFocusToggleOnSelect'
>;

const SimpleSelect: React.FC<SimpleSelectProps> = ({
  toggleLabel,
  toggleId,
  onSelect,
  isFullWidth,
  options,
  selected,
  isDisabled,
  style,
  dataTestId,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      {...props}
      isOpen={isOpen}
      selected={selected || toggleLabel}
      onSelect={(e, value) => {
        onSelect(e, value);
        setIsOpen(false);
      }}
      onOpenChange={(open) => setIsOpen(open)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          id={toggleId}
          data-testid={dataTestId}
          aria-label="Options menu"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          style={style}
          isDisabled={isDisabled}
          isFullWidth={isFullWidth}
        >
          {toggleLabel}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <SelectList>
        {options.map(({ key, children, description }) => (
          <SelectOption key={key} value={key} description={description} data-testId={key}>
            {children}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default SimpleSelect;
