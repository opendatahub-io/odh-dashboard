import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  KebabToggle,
} from '@patternfly/react-core/deprecated';

type Item = {
  key: string;
  label: React.ReactNode;
  onClick: (key: string) => void;
  isDisabled?: boolean;
};
type Spacer = { isSpacer: true };
const isSpacer = (v: Item | Spacer): v is Spacer => 'isSpacer' in v;

type SimpleDropdownProps = {
  dropdownItems: (Item | Spacer)[];
} & Omit<
  React.ComponentProps<typeof Dropdown>,
  'isOpen' | 'isPlain' | 'position' | 'toggle' | 'dropdownItems' | 'onChange'
>;

const SimpleMenuActions: React.FC<SimpleDropdownProps> = ({ dropdownItems, ...props }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dropdown
      {...props}
      isOpen={open}
      isPlain
      toggle={<KebabToggle onToggle={() => setOpen(!open)} />}
      position="right"
      dropdownItems={dropdownItems.map((itemOrSpacer, i) =>
        isSpacer(itemOrSpacer) ? (
          <DropdownSeparator key={`spacer-${i}`} />
        ) : (
          <DropdownItem
            key={itemOrSpacer.key}
            isDisabled={itemOrSpacer.isDisabled}
            onClick={() => {
              itemOrSpacer.onClick(itemOrSpacer.key);
              setOpen(false);
            }}
          >
            {itemOrSpacer.label}
          </DropdownItem>
        ),
      )}
    />
  );
};

export default SimpleMenuActions;
