import React from 'react';
import {
  NotificationBadge,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  Tooltip,
  MenuToggle,
  DropdownItem,
  Dropdown,
  DropdownList,
  Select,
  SelectGroup,
  MenuSearch,
  MenuSearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Icon,
  Divider,
} from '@patternfly/react-core';
import { QuestionCircleIcon, MoonIcon, SunIcon, DesktopIcon } from '@patternfly/react-icons';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import LightBulbIcon from '#~/images/icons/LightBulbIcon';
import { COMMUNITY_LINK, DOC_LINK, SUPPORT_LINK, DEV_MODE, EXT_CLUSTER } from '#~/utilities/const';
import useNotification from '#~/utilities/useNotification';
import { updateImpersonateSettings } from '#~/services/impersonateService';
import { AppNotification } from '#~/redux/types';
import { useAppSelector } from '#~/redux/hooks';
import AboutDialog from '#~/app/AboutDialog';
import { useIsGuidedTourAvailable } from '#~/concepts/whatsNew/useIsGuidedTourAvailable';
import AppLauncher from './AppLauncher';
import { useAppContext } from './AppContext';
import { useThemeContext, type ColorScheme } from './ThemeContext';
import type { ContrastMode } from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { logout } from './appUtils';
import FeatureFlagLauncher, { FeatureFlagLauncherProps } from './featureFlags/FeatureFlagLauncher';
import { openWhatsNewTour } from './whatsNew/whatsNewEvent';
import MastheadProjectSelector from './MastheadProjectSelector';

interface HeaderToolsProps {
  onNotificationsClick: () => void;
}

type Props = HeaderToolsProps & FeatureFlagLauncherProps;

const HeaderTools: React.FC<Props> = ({ onNotificationsClick, ...devFeatureFlagsProps }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState(false);
  const [aboutShown, setAboutShown] = React.useState(false);
  const [themeSwitcherOpen, setThemeSwitcherOpen] = React.useState(false);
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);
  const userName: string = useAppSelector((state) => state.user || '');
  const isImpersonating: boolean = useAppSelector((state) => state.isImpersonating || false);
  const { dashboardConfig } = useAppContext();
  const { theme, colorScheme, setColorScheme, contrastMode, setContrastMode } = useThemeContext();
  const notification = useNotification();
  const isGuidedTourAvailable = useIsGuidedTourAvailable();
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;

  const newNotifications = React.useMemo(
    () => notifications.filter((currentNotification) => !currentNotification.read).length,
    [notifications],
  );

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
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
        isExternalLink
      >
        Documentation
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
        isExternalLink
      >
        Support
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
        isExternalLink
      >
        Community
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
        {unifiedProjectSelectorEnabled && (
          <ToolbarItem>
            <MastheadProjectSelector />
          </ToolbarItem>
        )}
        <ToolbarGroup variant="action-group-plain" align={{ default: 'alignEnd' }}>
          {isGuidedTourAvailable ? (
            <ToolbarItem>
              <Tooltip content="Take a guided tour" position="bottom">
                <Button
                  variant="plain"
                  aria-label="Take a guided tour"
                  onClick={() => openWhatsNewTour('masthead')}
                  data-testid="whats-new-button"
                >
                  <LightBulbIcon style={{ fontSize: 'var(--pf-t--global--font--size--lg)' }} />
                </Button>
              </Tooltip>
            </ToolbarItem>
          ) : null}
          <ToolbarItem>
            <Tooltip content="Notifications" position="bottom">
              <NotificationBadge
                aria-label="Notification drawer"
                variant="read"
                count={newNotifications}
                onClick={onNotificationsClick}
              />
            </Tooltip>
          </ToolbarItem>
          {DEV_MODE && (
            <ToolbarItem data-testid="feature-flags-menu">
              <FeatureFlagLauncher {...devFeatureFlagsProps} />
            </ToolbarItem>
          )}

          {!dashboardConfig.spec.dashboardConfig.disableAppLauncher ? (
            <ToolbarItem data-testid="application-launcher">
              <Tooltip content="Applications" position="bottom">
                <AppLauncher />
              </Tooltip>
            </ToolbarItem>
          ) : null}
          <ToolbarItem>
            <Dropdown
              popperProps={{ position: 'right' }}
              onOpenChange={(isOpen) => setHelpMenuOpen(isOpen)}
              toggle={(toggleRef) => (
                <Tooltip content="Info" triggerRef={toggleRef} position="bottom">
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
                </Tooltip>
              )}
              isOpen={helpMenuOpen}
            >
              <DropdownList>{helpMenuItems}</DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            <Select
              isOpen={themeSwitcherOpen}
              onOpenChange={(isOpen) => setThemeSwitcherOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setThemeSwitcherOpen(!themeSwitcherOpen)}
                  isExpanded={themeSwitcherOpen}
                  icon={
                    <Icon size="lg">{theme === 'dark' ? <MoonIcon /> : <SunIcon />}</Icon>
                  }
                  aria-label={`Theme selection, current: ${colorScheme}`}
                  data-testid="appearance-settings-button"
                />
              )}
              shouldFocusToggleOnSelect
              onOpenChangeKeys={['Escape']}
              popperProps={{ position: 'right', enableFlip: true, preventOverflow: true }}
            >
              <SelectGroup
                label={
                  <div className="pf-v6-c-menu__group-title" id="theme-selector-color-scheme-title">
                    Color scheme
                  </div>
                }
              >
                <MenuSearch>
                  <MenuSearchInput>
                    <ToggleGroup aria-labelledby="theme-selector-color-scheme-title">
                      <ToggleGroupItem
                        text="System"
                        buttonId="system"
                        isSelected={colorScheme === 'system'}
                        onChange={() => setColorScheme('system')}
                      />
                      <ToggleGroupItem
                        text="Light"
                        buttonId="light"
                        isSelected={colorScheme === 'light'}
                        onChange={() => setColorScheme('light')}
                      />
                      <ToggleGroupItem
                        text="Dark"
                        buttonId="dark"
                        isSelected={colorScheme === 'dark'}
                        onChange={() => setColorScheme('dark')}
                      />
                    </ToggleGroup>
                  </MenuSearchInput>
                </MenuSearch>
              </SelectGroup>
              <Divider />
              <SelectGroup
                label={
                  <div className="pf-v6-c-menu__group-title" id="theme-selector-contrast-title">
                    Contrast mode
                  </div>
                }
              >
                <MenuSearch>
                  <MenuSearchInput>
                    <ToggleGroup aria-labelledby="theme-selector-contrast-title">
                      <ToggleGroupItem
                        text="System"
                        buttonId="system"
                        isSelected={contrastMode === 'system'}
                        onChange={() => setContrastMode('system')}
                      />
                      <ToggleGroupItem
                        text="Default"
                        buttonId="default"
                        isSelected={contrastMode === 'default'}
                        onChange={() => setContrastMode('default')}
                      />
                      <ToggleGroupItem
                        text="Glass"
                        buttonId="glass"
                        isSelected={contrastMode === 'glass'}
                        onChange={() => setContrastMode('glass')}
                      />
                    </ToggleGroup>
                  </MenuSearchInput>
                </MenuSearch>
              </SelectGroup>
            </Select>
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
            toggle={(toggleRef) => (
              <Tooltip content="User Menu" triggerRef={toggleRef}>
                <MenuToggle
                  aria-label="User menu"
                  id="user-menu-toggle"
                  ref={toggleRef}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  isExpanded={userMenuOpen}
                >
                  {userName}
                </MenuToggle>
              </Tooltip>
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
