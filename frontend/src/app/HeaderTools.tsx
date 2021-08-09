import React from 'react';
import { useSelector } from 'react-redux';
import {
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  NotificationBadge,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  DropdownItem,
} from '@patternfly/react-core';
import { CaretDownIcon, ExternalLinkAltIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import { COMMUNITY_LINK, DOC_LINK, SUPPORT_LINK } from '../utilities/const';
import { AppNotification, State } from '../redux/types';
import { useWatchDashboardConfig } from '../utilities/useWatchDashboardConfig';

interface HeaderToolsProps {
  onNotificationsClick: () => void;
}

const HeaderTools: React.FC<HeaderToolsProps> = ({ onNotificationsClick }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState<boolean>(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState<boolean>(false);
  const notifications: AppNotification[] = useSelector<State, AppNotification[]>(
    (state) => state.appState.notifications,
  );
  const userName: string = useSelector<State, string>((state) => state.appState.user || '');
  const { dashboardConfig } = useWatchDashboardConfig();

  const newNotifications = React.useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);

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

  const handleHelpClick = () => {
    setHelpMenuOpen(false);
  };

  const helpMenuItems: React.ReactElement[] = [];
  if (DOC_LINK) {
    helpMenuItems.push(
      <DropdownItem
        key="documentation"
        onClick={handleHelpClick}
        className="odh-dashboard__external-link"
        href={DOC_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Documentation
        <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }
  if (SUPPORT_LINK && !dashboardConfig.disableSupport) {
    helpMenuItems.push(
      <DropdownItem
        key="support"
        onClick={handleHelpClick}
        className="odh-dashboard__external-link"
        href={SUPPORT_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Support
        <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }
  if (COMMUNITY_LINK) {
    helpMenuItems.push(
      <DropdownItem
        key="community"
        onClick={handleHelpClick}
        className="odh-dashboard__external-link"
        href={COMMUNITY_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Community
        <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }

  return (
    <PageHeaderTools>
      <PageHeaderToolsGroup className="hidden-xs">
        <PageHeaderToolsItem>
          <NotificationBadge isRead count={newNotifications} onClick={onNotificationsClick} />
        </PageHeaderToolsItem>
        {helpMenuItems.length > 0 ? (
          <PageHeaderToolsItem>
            <Dropdown
              position={DropdownPosition.right}
              toggle={
                <DropdownToggle
                  id="toggle-id"
                  onToggle={() => setHelpMenuOpen(!helpMenuOpen)}
                  toggleIndicator={CaretDownIcon}
                >
                  <QuestionCircleIcon />
                </DropdownToggle>
              }
              isOpen={helpMenuOpen}
              dropdownItems={helpMenuItems}
            />
          </PageHeaderToolsItem>
        ) : null}
        <PageHeaderToolsItem>
          <Dropdown
            position={DropdownPosition.right}
            toggle={
              <DropdownToggle
                id="toggle-id"
                onToggle={() => setUserMenuOpen(!userMenuOpen)}
                toggleIndicator={CaretDownIcon}
              >
                {userName}
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
