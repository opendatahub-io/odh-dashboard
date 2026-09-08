import React from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { useSettings } from 'mod-arch-core';

// Logout via oauth2-proxy's GET sign-out endpoint, matching the main dashboard
// (frontend/src/app/appUtils.ts). GET is CSRF-able but the only impact is an
// unwanted logout; POST hardening would require oauth2-proxy support.
export const PORTAL_SIGN_OUT_PATH = '/oauth2/sign_out';

const navigateTo = (path: string): void => {
  window.location.href = path;
};

export const portalLogout = (redirect = navigateTo): void => {
  redirect(PORTAL_SIGN_OUT_PATH);
};

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
        <DropdownItem key="logout" onClick={() => portalLogout()}>
          Log out
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

export default UserDropdown;
