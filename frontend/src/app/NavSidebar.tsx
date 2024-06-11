import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  PageSidebar,
  PageSidebarBody,
} from '@patternfly/react-core';
import { isNavDataGroup, NavDataGroup, NavDataHref, useBuildNavData } from '~/utilities/NavData';

const checkLinkActiveStatus = (pathname: string, href: string) =>
  href.split('/')[1] === pathname.split('/')[1];

const NavHref: React.FC<{ item: NavDataHref; pathname: string }> = ({ item, pathname }) => (
  <NavItem
    key={item.id}
    data-id={item.id}
    itemId={item.id}
    isActive={checkLinkActiveStatus(pathname, item.href)}
  >
    <Link to={item.href}>{item.label}</Link>
  </NavItem>
);

const NavGroup: React.FC<{ item: NavDataGroup; pathname: string }> = ({ item, pathname }) => {
  const { group, children } = item;
  const isActive = !!children.find((c) => checkLinkActiveStatus(pathname, c.href));
  const [expanded, setExpanded] = React.useState(isActive);

  // Whenever the group becomes active, it should also be expanded
  React.useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  return (
    <NavExpandable
      data-id={group.id}
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
        <NavHref key={childItem.id} data-id={childItem.id} item={childItem} pathname={pathname} />
      ))}
    </NavExpandable>
  );
};

const NavSidebar: React.FC = () => {
  const routerLocation = useLocation();
  const userNavData = useBuildNavData();

  return (
    <PageSidebar theme="dark">
      <PageSidebarBody>
        <Nav theme="dark" aria-label="Nav">
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
      </PageSidebarBody>
    </PageSidebar>
  );
};

export default NavSidebar;
