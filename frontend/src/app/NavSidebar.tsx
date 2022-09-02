import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav, NavExpandable, NavItem, NavList, PageSidebar } from '@patternfly/react-core';
import { getNavBarData, isNavDataGroup, NavDataGroup, NavDataHref } from '../utilities/NavData';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';
import AppContext from './AppContext';
import { useUser } from '../redux/selectors';

const NavHref: React.FC<{ item: NavDataHref; pathname: string }> = ({ item, pathname }) => (
  <NavItem key={item.id} itemId={item.id} isActive={pathname === item.href}>
    <Link to={item.href} aria-label={item.label}>
      {item.label}
    </Link>
  </NavItem>
);

const NavGroup: React.FC<{ item: NavDataGroup; pathname: string }> = ({ item, pathname }) => {
  const { group, children } = item;
  const isActive = !!children.find((c) => pathname === c.href);
  const [expanded, setExpanded] = React.useState<boolean>(isActive);

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
        <NavHref key={childItem.id} item={childItem} pathname={pathname} />
      ))}
    </NavExpandable>
  );
};

const NavSidebar: React.FC = () => {
  const { isNavOpen } = React.useContext(AppContext);
  const routerLocation = useLocation();
  const { isAdmin } = useUser();
  const { dashboardConfig } = useWatchDashboardConfig();
  const userNavData = getNavBarData(isAdmin, dashboardConfig);
  const nav = (
    <Nav className="nav" theme="dark" aria-label="Nav">
      <NavList>
        {userNavData.map((item) =>
          isNavDataGroup(item) ? (
            <NavGroup key={item.id} item={item} pathname={routerLocation.pathname} />
          ) : (
            <NavHref key={item.id} item={item} pathname={routerLocation.pathname} />
          ),
        )}
      </NavList>
    </Nav>
  );
  return <PageSidebar isNavOpen={isNavOpen} nav={nav} theme="dark" />;
};

export default NavSidebar;
