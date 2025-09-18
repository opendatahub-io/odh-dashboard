import * as React from 'react';
import { matchPath, NavLink, useLocation, useMatch } from 'react-router-dom';
import {
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  PageSidebar,
  PageSidebarBody,
} from '@patternfly/react-core';
import { isNavDataGroup, NavDataHref, NavDataGroup, NavDataItem } from '~/app/standalone/types';

const NavHref: React.FC<{ item: NavDataHref }> = ({ item }) => {
  const isMatch = !!useMatch(item.path);
  return (
    <NavItem isActive={isMatch} key={item.label} data-id={item.label} itemId={item.label}>
      <NavLink to={item.href}>{item.label}</NavLink>
    </NavItem>
  );
};

const NavGroup: React.FC<{ item: NavDataGroup }> = ({ item }) => {
  const { children } = item;
  const { pathname } = useLocation();
  const isActive = children.some((child) => matchPath(child.path, pathname));
  const [expanded, setExpanded] = React.useState(isActive);

  return (
    <NavExpandable
      data-id={item.label}
      key={item.label}
      id={item.label}
      title={item.label}
      groupId={item.label}
      isExpanded={expanded}
      onExpand={(e, val) => setExpanded(val)}
      aria-label={item.label}
      isActive={isActive}
    >
      {children.map((childItem) => (
        <NavHref key={childItem.label} data-id={childItem.label} item={childItem} />
      ))}
    </NavExpandable>
  );
};

export type NavSidebarProps = {
  navData: NavDataItem[];
};

const NavSidebar: React.FC<NavSidebarProps> = ({ navData }) => (
  <PageSidebar>
    <PageSidebarBody>
      <Nav id="nav-primary-simple">
        <NavList id="nav-list-simple">
          {navData.map((item) =>
            isNavDataGroup(item) ? (
              <NavGroup key={item.label} item={item} />
            ) : (
              <NavHref key={item.label} item={item} />
            ),
          )}
        </NavList>
      </Nav>
    </PageSidebarBody>
  </PageSidebar>
);

export default NavSidebar;
