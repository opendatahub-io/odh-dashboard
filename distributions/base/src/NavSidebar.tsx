import React from 'react';
import { Nav, NavList, PageSidebar, PageSidebarBody } from '@patternfly/react-core';

type NavSidebarProps = {
  children?: React.ReactNode;
};

const NavSidebar: React.FC<NavSidebarProps> = ({ children }) => (
  <PageSidebar>
    <PageSidebarBody>
      <Nav aria-label="Navigation">
        <NavList>{children}</NavList>
      </Nav>
    </PageSidebarBody>
  </PageSidebar>
);

export default NavSidebar;
