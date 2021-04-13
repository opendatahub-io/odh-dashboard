import React from 'react';
import {
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  DropdownItem,
} from '@patternfly/react-core';
import { CaretDownIcon, UserIcon } from '@patternfly/react-icons';

const HeaderTools: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = React.useState<boolean>(false);

  const handleLogout = () => {
    setUserMenuOpen(false);
    fetch('/oauth/sign_out')
      .then(() => console.log('logged out'))
      .catch((err) => console.error(err))
      .finally(() => window.location.reload());
  };

  const userMenuItems = [
    <DropdownItem key="logout" onClick={handleLogout}>
      Log out
    </DropdownItem>,
  ];

  return (
    <PageHeaderTools>
      <PageHeaderToolsGroup className="hidden-xs">
        <PageHeaderToolsItem>
          <Dropdown
            position={DropdownPosition.right}
            toggle={
              <DropdownToggle
                id="toggle-id"
                onToggle={() => setUserMenuOpen(!userMenuOpen)}
                toggleIndicator={CaretDownIcon}
              >
                <UserIcon className="odh-dashboard__user-icon" />
              </DropdownToggle>
            }
            isOpen={userMenuOpen}
            dropdownItems={userMenuItems}
          />
        </PageHeaderToolsItem>
      </PageHeaderToolsGroup>
    </PageHeaderTools>
  );
};

export default HeaderTools;
