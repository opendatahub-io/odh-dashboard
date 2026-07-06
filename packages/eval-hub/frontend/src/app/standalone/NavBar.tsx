import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Masthead,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
  MenuToggleElement,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { BarsIcon } from '@patternfly/react-icons';
import NamespaceSelector from './NamespaceSelector';

interface NavBarProps {
  username?: string;
  onLogout: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ username, onLogout }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const handleLogout = () => {
    setUserMenuOpen(false);
    onLogout();
  };

  return (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton
            id="page-nav-toggle"
            variant="plain"
            aria-label="Dashboard navigation"
            isHamburgerButton
          >
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
      </MastheadMain>
      <MastheadContent>
        <Toolbar>
          <ToolbarContent>
            <ToolbarGroup variant="action-group-plain" align={{ default: 'alignStart' }}>
              <ToolbarItem className="kubeflow-u-namespace-select">
                <NamespaceSelector />
              </ToolbarItem>
            </ToolbarGroup>
            {username && (
              <ToolbarGroup variant="action-group-plain" align={{ default: 'alignEnd' }}>
                <ToolbarItem>
                  <Dropdown
                    popperProps={{ position: 'right' }}
                    onOpenChange={(isOpen) => setUserMenuOpen(isOpen)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        aria-label="User menu"
                        id="user-menu-toggle"
                        data-testid="user-menu-toggle-button"
                        ref={toggleRef}
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        isExpanded={userMenuOpen}
                      >
                        {username}
                      </MenuToggle>
                    )}
                    isOpen={userMenuOpen}
                  >
                    <DropdownList>
                      <DropdownItem key="logout" onClick={handleLogout}>
                        Log out
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </ToolbarItem>
              </ToolbarGroup>
            )}
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

export default NavBar;
