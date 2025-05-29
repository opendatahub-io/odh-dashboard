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
import { StatusReportIcon } from '~/app/status-provider/StatusReportIcon';
import { getStatusReportSummary } from '~/app/status-provider/utils';
import { SupportedArea } from '~/concepts/areas/types';
import { useIsAreaAvailable } from '~/concepts/areas';
import { NavItem } from './NavItem';
import { NavItemTitle } from './NavItemTitle';
import { compareNavItemGroups } from './utils';

type Props = {
  extension: NavSectionExtension;
};

const filterNavExtensions = (
  allExtensions: LoadedExtension<NavExtension>[],
  sectionId: string,
  activeAreas: SupportedArea[],
): LoadedExtension<NavExtension>[] => {
  const idMap = new Map<string, LoadedExtension<NavExtension>>();

  allExtensions
    .filter(
      (extension) =>
        !isNavSectionExtension(extension) && sectionId === extension.properties.section,
    )
    .forEach((extensionToAdd) => {
      if (isHrefNavItemExtension(extensionToAdd)) {
        let isDisallowed = false;
        if (extensionToAdd.flags?.disallowed) {
          isDisallowed = extensionToAdd.flags.disallowed.some((disallowedFlag) =>
            activeAreas.some((activeArea) => activeArea === disallowedFlag),
          );
        }

        if (isDisallowed) {
          return;
        }

        const currentExtensionInMap = idMap.get(extensionToAdd.properties.id);

        if (!currentExtensionInMap) {
          idMap.set(extensionToAdd.properties.id, extensionToAdd);
        }
      }
    });

  return Array.from(idMap.values()).toSorted(compareNavItemGroups);
};

export const NavSection: React.FC<Props> = ({
  extension: {
    properties: { id, title, dataAttributes },
  },
}) => {
  const [status, setStatus] = React.useState<Record<string, StatusReport | undefined>>({});
  const { pathname } = useLocation();
  const allExtensions = useExtensions(isNavExtension);

  const pluginModelServingEnabled = useIsAreaAvailable(SupportedArea.PLUGIN_MODEL_SERVING).status;

  const enabledAreas = React.useMemo(() => {
    const areas: SupportedArea[] = [];
    if (pluginModelServingEnabled) {
      areas.push(SupportedArea.PLUGIN_MODEL_SERVING);
    }
    return areas;
  }, [pluginModelServingEnabled]);

  const navExtensions = React.useMemo(
    () => filterNavExtensions(allExtensions, id, enabledAreas),
    [id, allExtensions, enabledAreas],
  );

  const [accessReviewExtensions, isAccessReviewExtensionsLoaded] = useAccessReviewExtensions(
    navExtensions,
    (e) => (isHrefNavItemExtension(e) ? e.properties.accessReview : undefined),
  );

  const navExtensionIsActive = React.useCallback(
    (e: LoadedExtension<NavExtension>) => {
      if (isHrefNavItemExtension(e)) {
        return matchPath(e.properties.path ?? e.properties.href, pathname);
      }
      return false;
    },
    [pathname],
  );

  const isActive = React.useMemo(
    () => isAccessReviewExtensionsLoaded && accessReviewExtensions.some(navExtensionIsActive),
    [accessReviewExtensions, navExtensionIsActive, isAccessReviewExtensionsLoaded],
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
  if (!isAccessReviewExtensionsLoaded || accessReviewExtensions.length === 0) {
    return null;
  }

  return (
    <NavExpandable
      title={
        <NavItemTitle
          title={title}
          icon={summaryStatus ? <StatusReportIcon status={summaryStatus} /> : null}
        />
      }
      isActive={isActive}
      isExpanded={isExpanded}
      onExpand={(e, expandedState) => setIsExpanded(expandedState)}
      buttonProps={dataAttributes}
    >
      {accessReviewExtensions.map((extension) => (
        <NavItem
          key={extension.uid}
          extension={extension}
          onNotifyStatus={(newStatus) => onNotifyStatus(extension.uid, newStatus)}
        />
      ))}
    </NavExpandable>
  );
};
