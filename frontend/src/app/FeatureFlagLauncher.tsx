import React from 'react';
import { Dropdown, DropdownItem, MenuToggle } from '@patternfly/react-core';
import { FlagIcon } from '@patternfly/react-icons';
import './AppLauncher.scss';

const FeatureFlagLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(isOpenChange) => setIsOpen(isOpenChange)}
      onSelect={() => setIsOpen(false)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="Feature Flag Launcher"
          variant="plain"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          style={{ width: 'auto' }}
        >
          <FlagIcon />
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
      popperProps={{ position: 'right', appendTo: 'inline' }}
    >
      <DropdownItem
        key="edit"
        onClick={() => {
          /* handle edit flags */
          console.log('edit flags here TODO');
        }}
      >
        Edit Flags
      </DropdownItem>
      <DropdownItem
        key="restore"
        onClick={() => {
          /* handle restore flags */
          console.log('restore flags here TODO');
        }}
      >
        Restore Flags to default values
      </DropdownItem>
    </Dropdown>
  );
};

export default FeatureFlagLauncher;

// TODO:  inhale the devfeatureflags banner:  take the modal into it's own component;
// and use the same component for the launcher.  also:  show this to katie edwards for ux feedback
