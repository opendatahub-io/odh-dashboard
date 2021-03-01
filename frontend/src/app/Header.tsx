import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';
import rhodsLogo from '../images/rhods-logo.svg';
import HeaderTools from './HeaderTools';

type HeaderProps = {
  isNavOpen: boolean;
  onNavToggle: () => void;
};

const Header: React.FC<HeaderProps> = ({ isNavOpen, onNavToggle }) => {
  return (
    <PageHeader
      logo={<Brand src={rhodsLogo} alt="ODH Logo" />}
      headerTools={<HeaderTools />}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={onNavToggle}
    />
  );
};

export default Header;
