import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import odhLogo from '../images/odh-logo.svg';
import HeaderTools from './HeaderTools';

type HeaderProps = {
  isNavOpen: boolean;
  onNavToggle: () => void;
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ isNavOpen, onNavToggle, onNotificationsClick }) => {
  return (
    <PageHeader
      logo={<Brand src={odhLogo} alt="ODH Logo" />}
      headerTools={<HeaderTools onNotificationsClick={onNotificationsClick} />}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
