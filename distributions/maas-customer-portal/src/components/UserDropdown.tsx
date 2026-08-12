import React from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { useSettings, logout } from 'mod-arch-core';

const UserDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { userSettings } = useSettings();

  const displayName = userSettings?.userId ?? 'User';

  return (
    <Dropdown
      popperProps={{ position: 'right' }}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="User menu"
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
        >
          {displayName}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="logout" onClick={() => logout().finally(() => window.location.reload())}>
          Log out
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

export default UserDropdown;
