import * as React from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { NavExpandable } from '@patternfly/react-core';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  StatusReport,
  NavSectionExtension,
  NavExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
  isHrefNavItemExtension,
  isNavSectionExtension,
  isNavExtension,
  isTabRoutePageExtension,
  isTabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useAccessReviewExtensions } from '#~/utilities/useAccessReviewExtensions';
import { StatusReportIcon } from '#~/app/status-provider/StatusReportIcon';
import { getStatusReportSummary } from '#~/app/status-provider/utils';
import { NavItem } from './NavItem';
import { NavItemTitle } from './NavItemTitle';
import { compareNavItemGroups } from './utils';
import NavIcon from './NavIcon';

type AnyNavExtension = NavExtension | TabRoutePageExtension;

/** Returns true if the extension is a leaf nav item (href or tab-route page). */
const isLeafNavExtension = (e: Extension): boolean =>
  isHrefNavItemExtension(e) || isTabRoutePageExtension(e);

/** Gets the path/href for active state matching from a leaf extension. */
const getLeafPath = (e: Extension): string | undefined => {
  if (isHrefNavItemExtension(e)) {
    return e.properties.path ?? e.properties.href;
  }
  if (isTabRoutePageExtension(e)) {
    return e.properties.path;
  }
  return undefined;
};

/** Gets the access review from a leaf extension. */
const getLeafAccessReview = (e: Extension) => {
  if (isHrefNavItemExtension(e)) {
    return e.properties.accessReview;
  }
  if (isTabRoutePageExtension(e)) {
    return e.properties.accessReview;
  }
  return undefined;
};

type Props = {
  extension: NavSectionExtension;
};

export const NavSection: React.FC<Props> = ({
  extension: {
    properties: { id, title, dataAttributes, iconRef },
  },
}) => {
  const [status, setStatus] = React.useState<Record<string, StatusReport | undefined>>({});
  const { pathname } = useLocation();
  const navOnlyExtensions = useExtensions(isNavExtension);
  const tabRoutePageExtensions = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const tabRouteTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
  // Only include tab-route pages that have at least one registered tab
  const tabRoutePagesWithTabs = React.useMemo(
    () =>
      tabRoutePageExtensions.filter((page) =>
        tabRouteTabExtensions.some((tab) => tab.properties.pageId === page.properties.id),
      ),
    [tabRoutePageExtensions, tabRouteTabExtensions],
  );
  const extensions: LoadedExtension<AnyNavExtension>[] = React.useMemo(
    () => [...navOnlyExtensions, ...tabRoutePagesWithTabs],
    [navOnlyExtensions, tabRoutePagesWithTabs],
  );

  const navExtensions = React.useMemo(
    () =>
      extensions
        .filter((extension) => id === extension.properties.section)
        .toSorted(compareNavItemGroups),
    [id, extensions],
  );

  const { descendantExtensions, parentById } = React.useMemo(() => {
    const parentByIdMap = new Map<string, string | undefined>();
    navExtensions.forEach((child) => parentByIdMap.set(child.properties.id, id));

    const collectDescendants = (
      roots: LoadedExtension<AnyNavExtension>[],
    ): LoadedExtension<AnyNavExtension>[] =>
      roots.flatMap((ext) => {
        if (isNavSectionExtension(ext)) {
          const currentSectionId = ext.properties.id;
          const children = extensions.filter(
            (candidate) => candidate.properties.section === currentSectionId,
          );
          children.forEach((child) => parentByIdMap.set(child.properties.id, currentSectionId));
          return [ext, ...collectDescendants(children)];
        }
        return [ext];
      });

    return {
      descendantExtensions: collectDescendants(navExtensions),
      parentById: parentByIdMap,
    };
  }, [navExtensions, extensions, id]);

  const [allowedDescendants, isAllowedLoaded] = useAccessReviewExtensions(
    descendantExtensions,
    (e) => getLeafAccessReview(e),
  );

  const { visibleLeafIds, visibleSectionIds } = React.useMemo(() => {
    const leafIds = new Set<string>();
    const sectionIds = new Set<string>();

    const addAncestorSections = (childId: string): void => {
      const parentId = parentById.get(childId);
      if (parentId) {
        sectionIds.add(parentId);
        addAncestorSections(parentId);
      }
    };

    allowedDescendants.forEach((ext) => {
      if (isLeafNavExtension(ext)) {
        const leafId = ext.properties.id;
        leafIds.add(leafId);
        addAncestorSections(leafId);
      }
    });

    return { visibleLeafIds: leafIds, visibleSectionIds: sectionIds };
  }, [allowedDescendants, parentById]);

  const visibleChildren = React.useMemo(
    () =>
      navExtensions.filter((e) => {
        if (isLeafNavExtension(e)) {
          return visibleLeafIds.has(e.properties.id);
        }
        if (isNavSectionExtension(e)) {
          return visibleSectionIds.has(e.properties.id);
        }
        return false;
      }),
    [navExtensions, visibleLeafIds, visibleSectionIds],
  );

  const isActive = React.useMemo(
    () =>
      isAllowedLoaded &&
      allowedDescendants.some((e) => {
        const path = getLeafPath(e);
        return path ? !!matchPath(path, pathname) : false;
      }),
    [isAllowedLoaded, allowedDescendants, pathname],
  );

  const [isExpanded, setIsExpanded] = React.useState(isActive);

  // Whenever the section becomes active, it should also be expanded
  React.useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const onNotifyStatus = React.useCallback(
    (extensionId: string, newStatus: StatusReport | undefined) => {
      setStatus((prev) => ({ ...prev, [extensionId]: newStatus }));
    },
    [],
  );

  const summaryStatus = React.useMemo(
    () => getStatusReportSummary(Object.values(status).filter((s) => s != null)),
    [status],
  );

  // Section is empty
  if (!isAllowedLoaded || visibleChildren.length === 0) {
    return null;
  }

  return (
    <NavExpandable
      title={
        <NavItemTitle
          title={title}
          navIcon={iconRef ? <NavIcon componentRef={iconRef} /> : null}
          statusIcon={summaryStatus ? <StatusReportIcon status={summaryStatus} /> : null}
        />
      }
      isActive={isActive}
      isExpanded={isExpanded}
      onExpand={(e, expandedState) => setIsExpanded(expandedState)}
      buttonProps={dataAttributes}
    >
      {visibleChildren.map((extension) => (
        <NavItem
          key={extension.uid}
          extension={extension}
          onNotifyStatus={(newStatus) => onNotifyStatus(extension.uid, newStatus)}
        />
      ))}
    </NavExpandable>
  );
};
