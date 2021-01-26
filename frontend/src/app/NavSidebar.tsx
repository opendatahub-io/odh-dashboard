import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav, NavExpandable, NavItem, NavList, PageSidebar } from '@patternfly/react-core';
import { navData } from '../utilities/NavData';

const createNavItem = ({ id, label, href }, pathname) => {
  const isActive = pathname === href;

  return (
    <NavItem key={id} itemId={id} isActive={isActive}>
      <Link to={href}>{label}</Link>
    </NavItem>
  );
};

const createNavGroup = ({ group, children }, pathname) => {
  const isActive = !!children.find((c) => pathname === c.href);
  const [expanded, setExpanded] = React.useState<boolean>(isActive);

  return (
    <NavExpandable
      key={group.id}
      title={group.title}
      groupId={group.id}
      isActive={isActive}
      isExpanded={expanded}
      onExpand={(e, val) => setExpanded(val)}
    >
      {children.map((c) => createNavItem(c, pathname))}
    </NavExpandable>
  );
};

type NavSidebarProps = {
  isNavOpen: boolean;
};

const NavSidebar: React.FC<NavSidebarProps> = ({ isNavOpen }) => {
  const routerLocation = useLocation();

  const navItems = navData.map((item) => {
    if (item.group) {
      return createNavGroup(item, routerLocation.pathname);
    }
    return createNavItem(item, routerLocation.pathname);
  });

  const nav = (
    <Nav className="nav" theme="dark" aria-label="Nav">
      <NavList>{navItems}</NavList>
    </Nav>
  );
  return <PageSidebar isNavOpen={isNavOpen} nav={nav} theme="dark" />;
};

export default NavSidebar;
