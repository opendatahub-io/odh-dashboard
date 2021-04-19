import React from 'react';
import {
  Button,
  ButtonVariant,
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  PageHeaderTools,
  PageHeaderToolsGroup,
  PageHeaderToolsItem,
  DropdownItem,
} from '@patternfly/react-core';
import {
  CaretDownIcon,
  ExternalLinkAltIcon,
  QuestionCircleIcon,
  UserIcon,
} from '@patternfly/react-icons';
import { DOC_LINK, SUPPORT_LINK } from '../utilities/const';

const HeaderTools: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = React.useState<boolean>(false);
  const [helpMenuOpen, setHelpMenuOpen] = React.useState<boolean>(false);

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

  const helpMenuItems = [
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
