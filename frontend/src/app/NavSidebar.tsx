import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav, NavExpandable, NavItem, NavList, PageSidebar } from '@patternfly/react-core';
import { getNavBarData, NavDataItem } from '../utilities/NavData';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';
import AppContext from './AppContext';
import { useUser } from '../redux/selectors';

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

const NavSidebar: React.FC = () => {
  const { isNavOpen } = React.useContext(AppContext);
  const routerLocation = useLocation();
  const { isAdmin } = useUser();
  const { dashboardConfig } = useWatchDashboardConfig();
  const userNavData = getNavBarData(isAdmin, dashboardConfig);
  const nav = (
    <Nav className="nav" theme="dark" aria-label="Nav">
      <NavList>
        {userNavData.map((item) => (
          <NavDataItem key={item.id} item={item} pathname={routerLocation.pathname} />
        ))}
      </NavList>
    </Nav>
  );
  return <PageSidebar isNavOpen={isNavOpen} nav={nav} theme="dark" />;
};

export default NavSidebar;
