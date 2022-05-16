import React from 'react';
import { useSelector } from 'react-redux';
import {
  ApplicationLauncher,
  ApplicationLauncherGroup,
  ApplicationLauncherItem,
  ApplicationLauncherSeparator,
} from '@patternfly/react-core';
import openshiftLogo from '../images/openshift.svg';
import { RootState } from '../redux/types';
import { useWatchConsoleLinks } from '../utilities/useWatchConsoleLinks';
import { DashboardConfig } from '../types';
import { ODH_PRODUCT_NAME } from '../utilities/const';

type ApplicationAction = {
  label: string;
  href: string;
  image: React.ReactNode;
};

type Section = {
  label: string;
  actions: ApplicationAction[];
};

const odhConsoleLinkName = 'rhodslink';
const consolePrefix = 'console-openshift-console';

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

export const getOpenShiftConsoleAction = (): ApplicationAction | null => {
  const { hostname, protocol, port } = window.location;
  const hostParts = hostname.split('.').slice(1);
  if (hostParts.length < 2) {
    return null;
  }
  return {
    label: 'OpenShift Console',
    href: `${protocol}//${consolePrefix}.${hostParts.join('.')}:${port}`,
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

type AppLauncherProps = {
  dashboardConfig: DashboardConfig;
};

const AppLauncher: React.FC<AppLauncherProps> = ({ dashboardConfig }) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [clusterID, clusterBranding] = useSelector((state: RootState) => [
    state.appState.clusterID,
    state.appState.clusterBranding,
  ]);
  const { consoleLinks } = useWatchConsoleLinks();

  const applicationSections = React.useMemo<Section[]>(() => {
    const applicationLinks = consoleLinks
      .filter(
        (link) =>
          link.spec.location === 'ApplicationMenu' && link.metadata.name !== odhConsoleLinkName,
      )
      .sort((a, b) => a.spec.text.localeCompare(b.spec.text));

    const getODHApplications = (): Section[] => {
      const osConsoleAction = getOpenShiftConsoleAction();
      const ocmAction = dashboardConfig.disableClusterManager
        ? null
        : getOCMAction(clusterID, clusterBranding);

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
        image: <img src={link.spec.applicationMenu.imageURL} alt="" />,
      };
      const section = acc.find((section) => section.label === link.spec.applicationMenu.section);
      if (section) {
        section.actions.push(action);
      } else {
        acc.push({ label: link.spec.applicationMenu.section, actions: [action] });
      }
      return acc;
    }, getODHApplications());

    sections.sort((a, b) => sectionSortValue(a) - sectionSortValue(b));

    return sections;
  }, [clusterBranding, clusterID, consoleLinks, dashboardConfig.disableClusterManager]);

  const onToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const onSelect = () => {
    setIsOpen(false);
  };

  if (applicationSections.length === 0) {
    return null;
  }

  return (
    <ApplicationLauncher
      aria-label="Application launcher"
      onSelect={onSelect}
      onToggle={onToggle}
      isOpen={isOpen}
      items={applicationSections.map((section, sectionIndex) => (
        <ApplicationLauncherGroup key={section.label} label={section.label}>
          {section.actions.map((action) => (
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
          ))}
          <>
            {sectionIndex < applicationSections.length - 1 && (
              <ApplicationLauncherSeparator key={`separator-${sectionIndex}`} />
            )}
          </>
        </ApplicationLauncherGroup>
      ))}
      position="right"
      isGrouped
    />
  );
};

export default AppLauncher;
