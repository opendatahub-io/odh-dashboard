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
import {
  isNavDataGroup,
  isNavOption,
  NavDataGroup,
  NavDataHref,
  NavOption,
  useBuildNavData,
} from '~/utilities/NavData';

const checkLinkActiveStatus = (pathname: string, href: string) =>
  href.split('/')[1] === pathname.split('/')[1];

const NavSetting: React.FC<{ item: NavOption }> = ({ item }) => (
  <NavItem key={item.id} data-id={item.id} itemId={item.id} className="odh-dashboard__nav-setting">
    {item.child}
  </NavItem>
);

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
  const isActive = !!children.find(
    (c) => isNavOption(c) || checkLinkActiveStatus(pathname, c.href),
  );
  const [expanded, setExpanded] = React.useState(isActive);

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
      {children.map((childItem) =>
        isNavOption(childItem) ? (
          <NavSetting key={childItem.id} item={childItem} />
        ) : (
          <NavHref key={childItem.id} data-id={childItem.id} item={childItem} pathname={pathname} />
        ),
      )}
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
                <>
                  {isNavOption(item) ? (
                    <NavSetting item={item} />
                  ) : (
                    <NavHref key={item.id} item={item} pathname={routerLocation.pathname} />
                  )}
                </>
              ),
            )}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );
};

export default NavSidebar;
