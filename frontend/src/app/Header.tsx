import React from 'react';
import { Brand, PageHeader } from '@patternfly/react-core';

import odhLogo from '../images/odh-logo.svg';

type HeaderProps = {
  isNavOpen: boolean;
  onNavToggle: () => void;
};

// export const Header = ({ isNavOpen, onNavToggle }) => {
const Header: React.FC<HeaderProps> = () => {
  return (
    <PageHeader
      className="header"
      logo={<Brand src={odhLogo} alt="ODH Logo" />}
      // showNavToggle
      // isNavOpen={isNavOpen}
      // onNavToggle={onNavToggle}
    />
  );
};

export default Header;
