import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import HeaderTools from './HeaderTools';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '../utilities/const';
import { useAppContext } from './AppContext';
import { Link } from 'react-router-dom';
import { useUser } from '../redux/selectors';

type HeaderProps = {
  onNotificationsClick: () => void;
};

const Header: React.FC<HeaderProps> = ({ onNotificationsClick }) => {
  const { isNavOpen, onNavToggle } = useAppContext();
  const { isAllowed } = useUser();
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
      showNavToggle={isAllowed}
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
