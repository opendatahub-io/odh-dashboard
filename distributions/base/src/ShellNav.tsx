import React from 'react';
import { Link, matchPath, useLocation, useMatch } from 'react-router-dom';
import {
  Flex,
  FlexItem,
  Label,
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  PageSidebar,
  PageSidebarBody,
} from '@patternfly/react-core';
import {
  compareNavItemGroups,
  getTopLevelExtensions,
  useExtensions,
} from '@odh-dashboard/plugin-core';
import {
  isNavExtension,
  isHrefNavItemExtension,
  isNavSectionExtension,
  isTabRoutePageExtension,
  isTabRouteTabExtension,
  type NavExtension,
  type HrefNavItemExtension,
  type NavSectionExtension,
  type TabRoutePageExtension,
  type TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';

type AnyNavExtension = NavExtension | TabRoutePageExtension;

const NavItemContent: React.FC<{ title: string; label?: string }> = ({ title, label }) => {
  if (!label) {
    return title;
  }

  return (
    <Flex
      component="span"
      className="pf-v6-u-w-100"
      alignItems={{ default: 'alignItemsCenter' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem component="span" flex={{ default: 'flex_1' }}>
        {title}
      </FlexItem>
      <FlexItem component="span" alignSelf={{ default: 'alignSelfFlexStart' }}>
        <Label color="orange" variant="outline" isCompact>
          {label}
        </Label>
      </FlexItem>
    </Flex>
  );
};

const NavHrefItem: React.FC<{ extension: LoadedExtension<HrefNavItemExtension> }> = ({
  extension: {
    properties: { href, path, dataAttributes, title, label },
  },
}) => {
  const isMatch = !!useMatch(path ?? href);

  return (
    <NavItem isActive={isMatch}>
      <Link {...dataAttributes} to={href}>
        <NavItemContent title={title} label={label} />
      </Link>
    </NavItem>
  );
};

const NavTabRouteItem: React.FC<{ extension: LoadedExtension<TabRoutePageExtension> }> = ({
  extension: {
    properties: { id, href, path, dataAttributes, title, label },
  },
}) => {
  const allTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
  const tabs = React.useMemo(
    () => allTabExtensions.filter((tab) => tab.properties.pageId === id),
    [allTabExtensions, id],
  );
  const isMatch = !!useMatch(path);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <NavItem isActive={isMatch}>
      <Link {...dataAttributes} to={href}>
        <NavItemContent title={title} label={label} />
      </Link>
    </NavItem>
  );
};

const NavSectionItem: React.FC<{ extension: LoadedExtension<NavSectionExtension> }> = ({
  extension: {
    properties: { id, title, label },
  },
}) => {
  const { pathname } = useLocation();
  const allNavExtensions = useExtensions<NavExtension>(isNavExtension);
  const tabRoutePageExtensions = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const tabRouteTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);

  const tabRoutePagesWithTabs = React.useMemo(
    () =>
      tabRoutePageExtensions.filter((page) =>
        tabRouteTabExtensions.some((tab) => tab.properties.pageId === page.properties.id),
      ),
    [tabRoutePageExtensions, tabRouteTabExtensions],
  );

  const allExtensions: LoadedExtension<AnyNavExtension>[] = React.useMemo(
    () => [...allNavExtensions, ...tabRoutePagesWithTabs],
    [allNavExtensions, tabRoutePagesWithTabs],
  );

  const children = React.useMemo(
    () => allExtensions.filter((e) => e.properties.section === id).toSorted(compareNavItemGroups),
    [id, allExtensions],
  );
  const isActive = React.useMemo(
    () =>
      children.some((child) => {
        if (isHrefNavItemExtension(child)) {
          const matchTarget = child.properties.path ?? child.properties.href;
          return !!matchPath(matchTarget, pathname);
        }
        if (isTabRoutePageExtension(child)) {
          return !!matchPath(child.properties.path, pathname);
        }
        return false;
      }),
    [children, pathname],
  );

  const [isExpanded, setIsExpanded] = React.useState(isActive);

  React.useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  if (children.length === 0) {
    return null;
  }

  return (
    <NavExpandable
      title={<NavItemContent title={title} label={label} />}
      isActive={isActive}
      isExpanded={isExpanded}
      onExpand={(_e, expanded) => setIsExpanded(expanded)}
    >
      {children.map((child) => (
        <ShellNavItem key={child.uid} extension={child} />
      ))}
    </NavExpandable>
  );
};

const ShellNavItem: React.FC<{
  extension: LoadedExtension<NavExtension> | LoadedExtension<TabRoutePageExtension>;
}> = ({ extension }) => {
  if (isNavSectionExtension(extension)) {
    return <NavSectionItem extension={extension} />;
  }
  if (isTabRoutePageExtension(extension)) {
    return <NavTabRouteItem extension={extension} />;
  }
  if (isHrefNavItemExtension(extension)) {
    return <NavHrefItem extension={extension} />;
  }
  return null;
};

const ShellNav: React.FC = () => {
  const navExtensions = useExtensions<NavExtension>(isNavExtension);
  const tabRouteExtensions = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const topLevelExtensions = React.useMemo(
    () => getTopLevelExtensions([...navExtensions, ...tabRouteExtensions]),
    [navExtensions, tabRouteExtensions],
  );
  return (
    <PageSidebar>
      <PageSidebarBody>
        <Nav aria-label="Navigation">
          <NavList>
            {topLevelExtensions.map((extension) => (
              <ShellNavItem key={extension.uid} extension={extension} />
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );
};

export default ShellNav;
