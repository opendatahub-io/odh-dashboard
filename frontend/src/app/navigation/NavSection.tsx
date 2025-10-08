import * as React from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { NavExpandable } from '@patternfly/react-core';
import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  StatusReport,
  NavSectionExtension,
  NavExtension,
  isHrefNavItemExtension,
  isNavSectionExtension,
  isNavExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useAccessReviewExtensions } from '@odh-dashboard/internal/utilities/useAccessReviewExtensions';
import { StatusReportIcon } from '#~/app/status-provider/StatusReportIcon';
import { getStatusReportSummary } from '#~/app/status-provider/utils';
import { NavItem } from './NavItem';
import { NavItemTitle } from './NavItemTitle';
import { compareNavItemGroups } from './utils';
import NavIcon from './NavIcon';

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
  const extensions = useExtensions(isNavExtension);

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
      roots: LoadedExtension<NavExtension>[],
    ): LoadedExtension<NavExtension>[] => {
      return roots.flatMap((ext) => {
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
    };

    return {
      descendantExtensions: collectDescendants(navExtensions),
      parentById: parentByIdMap,
    };
  }, [navExtensions, extensions, id]);

  const [allowedDescendants, isAllowedLoaded] = useAccessReviewExtensions(
    descendantExtensions,
    (e) => (isHrefNavItemExtension(e) ? e.properties.accessReview : undefined),
  );

  const { visibleHrefIds, visibleSectionIds } = React.useMemo(() => {
    const hrefIds = new Set<string>();
    const sectionIds = new Set<string>();

    const addAncestorSections = (childId: string): void => {
      const parentId = parentById.get(childId);
      if (parentId) {
        sectionIds.add(parentId);
        addAncestorSections(parentId);
      }
    };

    allowedDescendants.forEach((ext) => {
      if (isHrefNavItemExtension(ext)) {
        const hrefId = ext.properties.id;
        hrefIds.add(hrefId);
        addAncestorSections(hrefId);
      }
    });

    return { visibleHrefIds: hrefIds, visibleSectionIds: sectionIds };
  }, [allowedDescendants, parentById]);

  const visibleChildren = React.useMemo(
    () =>
      navExtensions.filter((e) => {
        if (isHrefNavItemExtension(e)) {
          return visibleHrefIds.has(e.properties.id);
        }
        if (isNavSectionExtension(e)) {
          return visibleSectionIds.has(e.properties.id);
        }
        return false;
      }),
    [navExtensions, visibleHrefIds, visibleSectionIds],
  );

  const isActive = React.useMemo(
    () =>
      isAllowedLoaded &&
      allowedDescendants.some(
        (e) =>
          isHrefNavItemExtension(e) &&
          !!matchPath(e.properties.path ?? e.properties.href, pathname),
      ),
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
