import * as React from 'react';
import {
  MenuToggle,
  Dropdown,
  DropdownItem,
  Divider,
  DropdownList,
  TooltipProps,
  MenuToggleProps,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';

type Item = {
  key: string;
  label: React.ReactNode;
  onClick: (key: string) => void;
  isDisabled?: boolean;
  isAriaDisabled?: boolean;
  tooltip?: TooltipProps;
  ref?: React.Ref<HTMLAnchorElement | HTMLButtonElement>;
};
type Spacer = { isSpacer: true };
const isSpacer = (v: Item | Spacer): v is Spacer => 'isSpacer' in v;

type SimpleDropdownProps = {
  dropdownItems: (Item | Spacer)[];
  testId?: string;
  toggleLabel?: string;
  toggleProps?: Partial<MenuToggleProps>;
  variant?: React.ComponentProps<typeof MenuToggle>['variant'];
} & Omit<
  React.ComponentProps<typeof Dropdown>,
  'isOpen' | 'isPlain' | 'popperProps' | 'toggle' | 'onChange'
>;

const SimpleMenuActions: React.FC<SimpleDropdownProps> = ({
  dropdownItems,
  testId,
  toggleLabel,
  toggleProps,
  variant,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dropdown
      {...props}
      isOpen={open}
      onOpenChange={(isOpened) => setOpen(isOpened)}
      toggle={(toggleRef) => (
        <MenuToggle
          aria-label={toggleLabel ?? 'Actions'}
          data-testid={testId}
          variant={variant ?? (toggleLabel ? 'default' : 'plain')}
          ref={toggleRef}
          onClick={() => setOpen(!open)}
          isExpanded={open}
          {...toggleProps}
        >
          {toggleLabel ?? <EllipsisVIcon />}
        </MenuToggle>
      )}
      popperProps={
        !toggleLabel ? { position: 'right', appendTo: 'inline' } : { appendTo: 'inline' }
      }
    >
      <DropdownList>
        {dropdownItems.map((itemOrSpacer, i) =>
          isSpacer(itemOrSpacer) ? (
            <Divider key={`spacer-${i}`} />
          ) : (
            <DropdownItem
              ref={itemOrSpacer.ref}
              key={itemOrSpacer.key}
              isDisabled={itemOrSpacer.isDisabled}
              isAriaDisabled={itemOrSpacer.isAriaDisabled}
              tooltipProps={itemOrSpacer.tooltip}
              onClick={() => {
                itemOrSpacer.onClick(itemOrSpacer.key);
                setOpen(false);
              }}
            >
              {itemOrSpacer.label}
            </DropdownItem>
          ),
        )}
      </DropdownList>
    </Dropdown>
  );
};

export default SimpleMenuActions;
