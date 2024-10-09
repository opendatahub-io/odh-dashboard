import React from 'react';
import {
  NotificationBadge,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  Tooltip,
  MenuToggleElement,
  MenuToggle,
  DropdownItem,
  Dropdown,
  DropdownList,
  ToggleGroup,
  ToggleGroupItem,
  Icon,
} from '@patternfly/react-core';
import {
  ExternalLinkAltIcon,
  QuestionCircleIcon,
  MoonIcon,
  SunIcon,
} from '@patternfly/react-icons';
import { COMMUNITY_LINK, DOC_LINK, SUPPORT_LINK, DEV_MODE, EXT_CLUSTER } from '~/utilities/const';
import useNotification from '~/utilities/useNotification';
import { updateImpersonateSettings } from '~/services/impersonateService';
import { AppNotification } from '~/redux/types';
import { useAppSelector } from '~/redux/hooks';
import AboutDialog from '~/app/AboutDialog';
import AppLauncher from './AppLauncher';
import { useAppContext } from './AppContext';
import { logout } from './appUtils';

interface HeaderToolsProps {
  onNotificationsClick: () => void;
}

const HeaderTools: React.FC<HeaderToolsProps> = ({ onNotificationsClick }) => {
  const [isDarkTheme, setIsDarkTheme] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState(false);
  const [aboutShown, setAboutShown] = React.useState(false);
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);
  const userName: string = useAppSelector((state) => state.user || '');
  const isImpersonating: boolean = useAppSelector((state) => state.isImpersonating || false);
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();

  React.useEffect(() => {
    const htmlElement = document.getElementsByTagName('html')[0];
    if (isDarkTheme) {
      htmlElement.classList.add('pf-v6-theme-dark');
    } else {
      htmlElement.classList.remove('pf-v6-theme-dark');
    }
  }, [isDarkTheme]);

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
        to={DOC_LINK}
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
        to={SUPPORT_LINK}
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
        to={COMMUNITY_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Community <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }

  helpMenuItems.push(
    <DropdownItem
      key="about"
      data-testid="help-about-item"
      onClick={() => {
        handleHelpClick();
        setAboutShown(true);
      }}
    >
      About
    </DropdownItem>,
  );

  return (
    <Toolbar isFullHeight>
      <ToolbarContent>
        <ToolbarGroup variant="action-group-plain" align={{ default: 'alignEnd' }}>
          <ToolbarItem>
            <ToggleGroup aria-label="Dark theme toggle group">
              <ToggleGroupItem
                aria-label="light theme toggle"
                icon={
                  <Icon size="md">
                    <SunIcon />
                  </Icon>
                }
                isSelected={!isDarkTheme}
                onChange={() => setIsDarkTheme(false)}
              />
              <ToggleGroupItem
                aria-label="dark theme toggle"
                icon={
                  <Icon size="md">
                    <MoonIcon />
                  </Icon>
                }
                isSelected={isDarkTheme}
                onChange={() => setIsDarkTheme(true)}
              />
            </ToggleGroup>
          </ToolbarItem>
          {!dashboardConfig.spec.dashboardConfig.disableAppLauncher ? (
            <ToolbarItem data-testid="application-launcher">
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
          <ToolbarItem>
            <Dropdown
              popperProps={{ position: 'right' }}
              onOpenChange={(isOpen) => setHelpMenuOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  variant="plain"
                  aria-label="Help items"
                  id="help-icon-toggle"
                  ref={toggleRef}
                  onClick={() => setHelpMenuOpen(!helpMenuOpen)}
                  isExpanded={helpMenuOpen}
                >
                  <QuestionCircleIcon />
                </MenuToggle>
              )}
              isOpen={helpMenuOpen}
            >
              <DropdownList>{helpMenuItems}</DropdownList>
            </Dropdown>
          </ToolbarItem>
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
            popperProps={{ position: 'right' }}
            onOpenChange={(isOpen) => setUserMenuOpen(isOpen)}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                variant="plainText"
                aria-label="User menu"
                id="user-menu-toggle"
                ref={toggleRef}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                isExpanded={userMenuOpen}
              >
                {userName}
              </MenuToggle>
            )}
            isOpen={userMenuOpen}
          >
            <DropdownList>{userMenuItems}</DropdownList>
          </Dropdown>
        </ToolbarItem>
      </ToolbarContent>
      {aboutShown ? <AboutDialog onClose={() => setAboutShown(false)} /> : null}
    </Toolbar>
  );
};

export default HeaderTools;
