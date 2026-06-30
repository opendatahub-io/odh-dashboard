import React from 'react';
import { Link, matchPath, useLocation, useMatch } from 'react-router-dom';
import {
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  PageSidebar,
  PageSidebarBody,
} from '@patternfly/react-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  isNavExtension,
  isHrefNavItemExtension,
  isNavSectionExtension,
  type NavExtension,
  type HrefNavItemExtension,
  type NavSectionExtension,
  type NavItemProperties,
} from '@odh-dashboard/plugin-core/extension-points';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';

// TODO: Dedup — compareNavItemGroups and getTopLevelExtensions are copied from
// frontend/src/app/navigation/utils.ts. Move to plugin-core when consolidating.
const DEFAULT_GROUP = '5_default';

type NavLikeExtension = Extension<string, NavItemProperties>;

const compareNavItemGroups = <T extends NavLikeExtension>(a: T, b: T): number =>
  (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP);

const getTopLevelExtensions = <E extends NavLikeExtension>(extensions: E[]): E[] => {
  const existingSectionIds = new Set(
    extensions.filter((e) => isNavSectionExtension(e)).map((e) => e.properties.id),
  );

  const seenSectionIds = new Set<string>();
  const topLevel = extensions
    .filter((e) => !e.properties.section)
    .toSorted(compareNavItemGroups)
    .filter((e) => {
      if (isNavSectionExtension(e)) {
        if (seenSectionIds.has(e.properties.id)) {
          return false;
        }
        seenSectionIds.add(e.properties.id);
      }
      return true;
    });

  const orphanedExtensions = extensions.filter(
    (e) => e.properties.section && !existingSectionIds.has(e.properties.section),
  );

  const orphanedBySection = new Map<string, E[]>();
  orphanedExtensions.forEach((ext) => {
    const sectionId = ext.properties.section;
    if (sectionId) {
      let sections = orphanedBySection.get(sectionId);
      if (!sections) {
        sections = [];
        orphanedBySection.set(sectionId, sections);
      }
      sections.push(ext);
    }
  });

  const sortedOrphaned = Array.from(orphanedBySection.values())
    .map((group) => group.toSorted(compareNavItemGroups))
    .flat();

  return [...topLevel, ...sortedOrphaned];
};

const NavHrefItem: React.FC<{ extension: LoadedExtension<HrefNavItemExtension> }> = ({
  extension: {
    properties: { href, path, dataAttributes, title },
  },
}) => {
  const isMatch = !!useMatch(path ?? href);

  return (
    <NavItem isActive={isMatch}>
      <Link {...dataAttributes} to={href}>
        {title}
      </Link>
    </NavItem>
  );
};

const NavSectionItem: React.FC<{ extension: LoadedExtension<NavSectionExtension> }> = ({
  extension: {
    properties: { id, title },
  },
}) => {
  const { pathname } = useLocation();
  const allNavExtensions = useExtensions<NavExtension>(isNavExtension);
  const children = React.useMemo(
    () =>
      allNavExtensions.filter((e) => e.properties.section === id).toSorted(compareNavItemGroups),
    [id, allNavExtensions],
  );

  const isActive = React.useMemo(
    () =>
      children.some((child) => {
        if (isHrefNavItemExtension(child)) {
          const matchTarget = child.properties.path ?? child.properties.href;
          return !!matchPath(matchTarget, pathname);
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
      title={title}
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

const ShellNavItem: React.FC<{ extension: LoadedExtension<NavExtension> }> = ({ extension }) => {
  if (isNavSectionExtension(extension)) {
    return <NavSectionItem extension={extension} />;
  }
  if (isHrefNavItemExtension(extension)) {
    return <NavHrefItem extension={extension} />;
  }
  return null;
};

const ShellNav: React.FC = () => {
  const navExtensions = useExtensions<NavExtension>(isNavExtension);
  const topLevelExtensions = React.useMemo(
    () => getTopLevelExtensions(navExtensions),
    [navExtensions],
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
