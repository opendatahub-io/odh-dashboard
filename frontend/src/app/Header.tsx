import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import HeaderTools from './HeaderTools';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '../utilities/const';
import { useAppContext } from './AppContext';
import { Link } from 'react-router-dom';

type HeaderProps = {
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ onNotificationsClick }) => {
  const { isNavOpen, onNavToggle } = useAppContext();
  return (
    <PageHeader
      logo={
        <Brand
          src={`${window.location.origin}/images/${ODH_LOGO}`}
          alt={`${ODH_PRODUCT_NAME} Logo`}
        />
      }
      logoComponent={Link}
      logoProps={{ to: '/' }}
      headerTools={<HeaderTools onNotificationsClick={onNotificationsClick} />}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
