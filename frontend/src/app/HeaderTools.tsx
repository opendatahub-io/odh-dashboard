import React from 'react';
import {
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  NotificationBadge,
  DropdownItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import { COMMUNITY_LINK, DOC_LINK, SUPPORT_LINK } from '../utilities/const';
import { AppNotification } from '../redux/types';
import AppLauncher from './AppLauncher';
import { useAppContext } from './AppContext';
import { logout } from './appUtils';
import { useAppSelector } from '../redux/hooks';

interface HeaderToolsProps {
  onNotificationsClick: () => void;
}

const HeaderTools: React.FC<HeaderToolsProps> = ({ onNotificationsClick }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState(false);
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);
  const userName: string = useAppSelector((state) => state.user || '');
  const { dashboardConfig } = useAppContext();

  const newNotifications = React.useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout().then(() => {
      console.log('logged out');
      window.location.reload();
    });
  };

  const userMenuItems = [
    <DropdownItem key="logout" onClick={handleLogout}>
      Log out
    </DropdownItem>,
  ];

  const handleHelpClick = () => {
    setHelpMenuOpen(false);
  };

  const helpMenuItems: React.ReactElement[] = [];
  if (DOC_LINK) {
    helpMenuItems.push(
      <DropdownItem
        key="documentation"
        onClick={handleHelpClick}
        href={DOC_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Documentation <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }
  if (SUPPORT_LINK && !dashboardConfig.spec.dashboardConfig.disableSupport) {
    helpMenuItems.push(
      <DropdownItem
        key="support"
        onClick={handleHelpClick}
        href={SUPPORT_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Support <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }
  if (COMMUNITY_LINK) {
    helpMenuItems.push(
      <DropdownItem
        key="community"
        onClick={handleHelpClick}
        href={COMMUNITY_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Community <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }

  return (
    <Toolbar isFullHeight>
      <ToolbarContent>
        <ToolbarGroup variant="icon-button-group" alignment={{ default: 'alignRight' }}>
          {!dashboardConfig.spec.dashboardConfig.disableAppLauncher ? (
            <ToolbarItem>
              <AppLauncher />
            </ToolbarItem>
          ) : null}
          <ToolbarItem>
            <NotificationBadge isRead count={newNotifications} onClick={onNotificationsClick} />
          </ToolbarItem>
          {helpMenuItems.length > 0 ? (
            <ToolbarItem>
              <Dropdown
                removeFindDomNode
                isPlain
                position={DropdownPosition.right}
                toggle={
                  <DropdownToggle
                    toggleIndicator={null}
                    id="help-icon-toggle"
                    onToggle={() => setHelpMenuOpen(!helpMenuOpen)}
                  >
                    <QuestionCircleIcon />
                  </DropdownToggle>
                }
                isOpen={helpMenuOpen}
                dropdownItems={helpMenuItems}
              />
            </ToolbarItem>
          ) : null}
        </ToolbarGroup>
        <ToolbarItem>
          <Dropdown
            removeFindDomNode
            isPlain
            position={DropdownPosition.right}
            toggle={
              <DropdownToggle id="user-menu-toggle" onToggle={() => setUserMenuOpen(!userMenuOpen)}>
                {userName}
              </DropdownToggle>
            }
            isOpen={userMenuOpen}
            dropdownItems={userMenuItems}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default HeaderTools;
