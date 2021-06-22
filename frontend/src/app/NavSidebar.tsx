import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav, NavExpandable, NavItem, NavList, PageSidebar } from '@patternfly/react-core';
import { navData, NavDataItem } from '../utilities/NavData';

const NavDataItem: React.FC<{ item: NavDataItem; pathname: string }> = ({ item, pathname }) => {
  const { children, group } = item;
  const isGroup = group !== undefined;
  const isActive =
    group && children ? !!children.find((c) => pathname === c.href) : pathname === item.href;
  const [expanded, setExpanded] = React.useState<boolean>(isGroup && isActive);

  if (group && children?.length) {
    return (
      <NavExpandable
        key={group.id}
        id={group.id}
        title={group.title}
        groupId={group.id}
        isActive={isActive}
        isExpanded={expanded}
        onExpand={(e, val) => setExpanded(val)}
        aria-label={group.title}
      >
        {children.map((childItem) => (
          <NavDataItem key={childItem.id} item={childItem} pathname={pathname} />
        ))}
      </NavExpandable>
    );
  }
  return (
    <NavItem key={item.id} itemId={item.id} isActive={isActive}>
      <Link to={item.href || '/'} aria-label={item.label}>
        {item.label}
      </Link>
    </NavItem>
  );
};

type NavSidebarProps = {
  isNavOpen: boolean;
};

const NavSidebar: React.FC<NavSidebarProps> = ({ isNavOpen }) => {
  const routerLocation = useLocation();

  const nav = (
    <Nav className="nav" theme="dark" aria-label="Nav">
      <NavList>
        {navData.map((item) => (
          <NavDataItem key={item.id} item={item} pathname={routerLocation.pathname} />
        ))}
      </NavList>
    </Nav>
  );
  return <PageSidebar isNavOpen={isNavOpen} nav={nav} theme="dark" />;
};

export default NavSidebar;
