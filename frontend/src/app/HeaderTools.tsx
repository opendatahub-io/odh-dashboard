import React from 'react';
import {
  NotificationBadge,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  Tooltip,
} from '@patternfly/react-core';
import {
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  DropdownItem,
} from '@patternfly/react-core/deprecated';
import { ExternalLinkAltIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import { COMMUNITY_LINK, DOC_LINK, SUPPORT_LINK, DEV_MODE, EXT_CLUSTER } from '~/utilities/const';
import useNotification from '~/utilities/useNotification';
import { updateImpersonateSettings } from '~/services/impersonateService';
import { AppNotification } from '~/redux/types';
import { useAppSelector } from '~/redux/hooks';
import AppLauncher from './AppLauncher';
import { useAppContext } from './AppContext';
import { logout } from './appUtils';

interface HeaderToolsProps {
  onNotificationsClick: () => void;
}

const HeaderTools: React.FC<HeaderToolsProps> = ({ onNotificationsClick }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState(false);
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);
  const userName: string = useAppSelector((state) => state.user || '');
  const isImpersonating: boolean = useAppSelector((state) => state.isImpersonating || false);
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();

  const newNotifications = React.useMemo(
    () => notifications.filter((currentNotification) => !currentNotification.read).length,
    [notifications],
  );

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout().then(() => {
      /* eslint-disable-next-line no-console */
      console.log('logged out');
      window.location.reload();
    });
  };

  const userMenuItems = [
    <DropdownItem key="logout" onClick={handleLogout}>
      Log out
    </DropdownItem>,
  ];

  if (!EXT_CLUSTER && DEV_MODE && !isImpersonating) {
    userMenuItems.unshift(
      <DropdownItem
        key="impersonate"
        onClick={() => {
          updateImpersonateSettings(true)
            .then(() => location.reload())
            .catch((e) => notification.error('Failed impersonating user', e.message));
        }}
      >
        Start impersonate
      </DropdownItem>,
    );
  }

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
        <ToolbarGroup variant="icon-button-group" align={{ default: 'alignRight' }}>
          {!dashboardConfig.spec.dashboardConfig.disableAppLauncher ? (
            <ToolbarItem>
              <AppLauncher />
            </ToolbarItem>
          ) : null}
          <ToolbarItem>
            <NotificationBadge
              aria-label="Notification drawer"
              variant="read"
              count={newNotifications}
              onClick={onNotificationsClick}
            />
          </ToolbarItem>
          {helpMenuItems.length > 0 ? (
            <ToolbarItem>
              <Dropdown
                isPlain
                position={DropdownPosition.right}
                toggle={
                  <DropdownToggle
                    aria-label="Help items"
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
        {DEV_MODE && isImpersonating && (
          <ToolbarItem>
            <Tooltip
              content={`You are impersonating as ${userName}, click to stop impersonating`}
              position="bottom"
            >
              <Button
                onClick={() =>
                  updateImpersonateSettings(false)
                    .then(() => location.reload())
                    .catch((e) => notification.error('Failed stopping impersonating', e.message))
                }
              >
                Stop impersonate
              </Button>
            </Tooltip>
          </ToolbarItem>
        )}
        <ToolbarItem>
          <Dropdown
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
