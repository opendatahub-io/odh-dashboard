import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import HeaderTools from './HeaderTools';
import { ODH_PRODUCT_NAME } from '../utilities/const';
import logo from '../images/logo.svg';
import AppContext from './AppContext';
type HeaderProps = {
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ onNotificationsClick }) => {
  const { isNavOpen, onNavToggle } = React.useContext(AppContext);
  return (
    <PageHeader
      logo={<Brand src={logo} alt={`${ODH_PRODUCT_NAME} Logo`} />}
      headerTools={<HeaderTools onNotificationsClick={onNotificationsClick} />}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
