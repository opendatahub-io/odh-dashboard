import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import HeaderTools from './HeaderTools';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '../utilities/const';

type HeaderProps = {
  isNavOpen: boolean;
  onNavToggle: () => void;
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ isNavOpen, onNavToggle, onNotificationsClick }) => {
  return (
    <PageHeader
      logo={<Brand src={ODH_LOGO} alt={`${ODH_PRODUCT_NAME} Logo`} />}
      headerTools={<HeaderTools onNotificationsClick={onNotificationsClick} />}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
