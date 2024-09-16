import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Nav,
  NavExpandable,
  NavItem,
  NavGroup as PfNavGroup,
  NavList,
  PageSidebar,
  PageSidebarBody,
} from '@patternfly/react-core';
import {
  isNavDataGroup,
  isNavDataSection,
  NavDataGroup,
  NavDataHref,
  NavDataSection,
  useBuildNavData,
} from '~/utilities/NavData';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

const checkLinkActiveStatus = (pathname: string, href: string, namespace?: string) => {
  if (!namespace) {
    return href.split('/')[1] === pathname.split('/')[1];
  }

  const splits = href.split('/');
  const itemIdentifier = splits[splits.length - 1];

  let pathSplits = pathname.split('/');
  if (pathSplits[pathSplits.length - 2] === 'projects') {
    pathSplits = pathSplits.slice(0, -1);
  }
  const pathIdentifier = pathSplits[pathSplits.length - 1];

  return itemIdentifier ? (pathIdentifier || '/').includes(itemIdentifier) : !pathIdentifier;
};

const NavHref: React.FC<{ item: NavDataHref; pathname: string }> = ({ item, pathname }) => {
  const { preferredProject } = React.useContext(ProjectsContext);
  return (
    <NavItem
      key={item.id}
      data-id={item.id}
      itemId={item.id}
      isActive={checkLinkActiveStatus(pathname, item.href, preferredProject?.metadata.name)}
    >
      <Link to={item.href}>{item.label}</Link>
    </NavItem>
  );
};

const NavGroup: React.FC<{ item: NavDataGroup; pathname: string }> = ({ item, pathname }) => {
  const { group, children } = item;
  const { preferredProject } = React.useContext(ProjectsContext);
  const isActive = !!children.find((c) =>
    checkLinkActiveStatus(pathname, c.href, preferredProject?.metadata.name),
  );
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

const NavSection: React.FC<{ item: NavDataSection; pathname: string }> = ({ item, pathname }) => (
  <PfNavGroup
    data-id={item.section.id}
    key={item.section.id}
    id={item.section.id}
    title={item.section.title}
    aria-label={item.section.title}
  >
    {item.children.map((childItem) =>
      isNavDataGroup(childItem) ? (
        <NavGroup key={childItem.id} item={childItem} pathname={pathname} />
      ) : (
        <NavHref key={childItem.id} data-id={childItem.id} item={childItem} pathname={pathname} />
      ),
    )}
  </PfNavGroup>
);

const NavSidebar: React.FC = () => {
  const routerLocation = useLocation();
  const userNavData = useBuildNavData();

  return (
    <PageSidebar theme="dark">
      <PageSidebarBody>
        <Nav theme="dark" aria-label="Nav">
          <NavList>
            {userNavData.map((item) =>
              isNavDataSection(item) ? (
                <NavSection key={item.id} item={item} pathname={routerLocation.pathname} />
              ) : isNavDataGroup(item) ? (
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
