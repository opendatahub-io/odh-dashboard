import React from 'react';
import {
  ApplicationLauncher,
  ApplicationLauncherGroup,
  ApplicationLauncherItem,
  ApplicationLauncherSeparator,
} from '@patternfly/react-core/deprecated';
import openshiftLogo from '~/images/openshift.svg';
import { useWatchConsoleLinks } from '~/utilities/useWatchConsoleLinks';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { getOpenShiftConsoleServerURL } from '~/utilities/clusterUtils';
import { useClusterInfo } from '~/redux/selectors/clusterInfo';
import { ApplicationAction, Section } from '~/types';
import { useAppContext } from './AppContext';

const odhConsoleLinkName = 'rhodslink';

export const getOCMAction = (
  clusterID?: string,
  clusterBranding?: string,
): ApplicationAction | null => {
  if (clusterID && clusterBranding !== 'okd' && clusterBranding !== 'azure') {
    return {
      label: 'OpenShift Cluster Manager',
      href: `https://cloud.redhat.com/openshift/details/${clusterID}`,
      image: <img src={openshiftLogo} alt="" />,
    };
  }
  return null;
};

export const getOpenShiftConsoleAction = (serverURL?: string): ApplicationAction | null => {
  const href = getOpenShiftConsoleServerURL(serverURL);
  if (!href) {
    return null;
  }

  return {
    label: 'OpenShift Console',
    href,
    image: <img src={openshiftLogo} alt="" />,
  };
};

const sectionSortValue = (section: Section): number => {
  switch (section.label) {
    case 'ODH_PRODUCT_NAME Applications':
      return 0;
    case 'Third Party Applications':
      return 1;
    case 'Customer Applications':
      return 2;
    case '':
      return 9; // Items w/o sections go last
    default:
      return 3; // Custom groups come after well-known groups
  }
};

const AppLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { clusterID, clusterBranding, serverURL } = useClusterInfo();
  const { consoleLinks } = useWatchConsoleLinks();
  const { dashboardConfig } = useAppContext();

  const { disableClusterManager } = dashboardConfig.spec.dashboardConfig;

  const applicationSections = React.useMemo<Section[]>(() => {
    const applicationLinks = consoleLinks
      .filter(
        (link) =>
          link.spec.location === 'ApplicationMenu' && link.metadata?.name !== odhConsoleLinkName,
      )
      .sort((a, b) => a.spec.text.localeCompare(b.spec.text));

    const getODHApplications = (): Section[] => {
      const osConsoleAction = getOpenShiftConsoleAction(serverURL);
      const ocmAction = disableClusterManager ? null : getOCMAction(clusterID, clusterBranding);

      if (!osConsoleAction && !ocmAction) {
        return [];
      }
      const section: Section = {
        label: `${ODH_PRODUCT_NAME} Applications`,
        actions: [],
      };
      if (osConsoleAction) {
        section.actions.push(osConsoleAction);
      }
      if (ocmAction) {
        section.actions.push(ocmAction);
      }
      return [section];
    };

    const sections: Section[] = applicationLinks.reduce((acc, link) => {
      const action: ApplicationAction = {
        label: link.spec.text,
        href: link.spec.href,
        image: <img src={link.spec.applicationMenu?.imageUrl} alt="" />,
      };
      const section = acc.find(
        (currentSection) => currentSection.label === link.spec.applicationMenu?.section,
      );
      if (section) {
        section.actions.push(action);
      } else {
        acc.push({ label: link.spec.applicationMenu?.section, actions: [action] });
      }
      return acc;
    }, getODHApplications());

    sections.sort((a, b) => sectionSortValue(a) - sectionSortValue(b));

    return sections;
  }, [clusterBranding, clusterID, consoleLinks, disableClusterManager, serverURL]);

  const onToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const onSelect = () => {
    setIsOpen(false);
  };

  if (applicationSections.length === 0) {
    return null;
  }

  const renderApplicationLauncherGroup = (section: Section, sectionIndex: number) => {
    const appItems = section.actions.map((action) => (
      <ApplicationLauncherItem
        key={action.label}
        href={action.href}
        isExternal
        icon={action.image}
        rel="noopener noreferrer"
        target="_blank"
      >
        {action.label}
      </ApplicationLauncherItem>
    ));
    if (sectionIndex < applicationSections.length - 1) {
      appItems.push(<ApplicationLauncherSeparator key={`separator-${sectionIndex}`} />);
    }
    return (
      <ApplicationLauncherGroup key={section.label} label={section.label}>
        {appItems}
      </ApplicationLauncherGroup>
    );
  };
  return (
    <ApplicationLauncher
      aria-label="Application launcher"
      onSelect={onSelect}
      onToggle={onToggle}
      isOpen={isOpen}
      items={applicationSections.map(renderApplicationLauncherGroup)}
      position="right"
      isGrouped
    />
  );
};

export default AppLauncher;
