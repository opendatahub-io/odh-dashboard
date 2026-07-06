import React from 'react';
import { PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { ExtensibleNav } from './navigation/ExtensibleNav';

const NavSidebar: React.FC = () => (
  <PageSidebar>
    <PageSidebarBody>
      <ExtensibleNav label="Nav" />
    </PageSidebarBody>
  </PageSidebar>
);

export default NavSidebar;
