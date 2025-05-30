import React from 'react';
import {
  Divider,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { ThIcon } from '@patternfly/react-icons';
import openshiftLogo from '#~/images/openshift.svg';
import { useWatchConsoleLinks } from '#~/utilities/useWatchConsoleLinks';
import { getOpenShiftConsoleServerURL } from '#~/utilities/clusterUtils';
import { useClusterInfo } from '#~/redux/selectors/clusterInfo';
import { ApplicationAction, Section } from '#~/types';
import { useAppContext } from './AppContext';
import './AppLauncher.scss';

const appConsoleLinkNames = ['rhodslink', 'odhlink'];

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
          link.spec.location === 'ApplicationMenu' &&
          !appConsoleLinkNames.includes(link.metadata?.name ?? ''),
      )
      .toSorted((a, b) => a.spec.text.localeCompare(b.spec.text));

    const getODHApplications = (): Section[] => {
      const osConsoleAction = getOpenShiftConsoleAction(serverURL);
      const ocmAction = disableClusterManager ? null : getOCMAction(clusterID, clusterBranding);

      if (!osConsoleAction && !ocmAction) {
        return [];
      }
      const section: Section = {
        label: `Red Hat Applications`,
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
        image: <img src={link.spec.applicationMenu?.imageURL} alt={`${link.spec.text} logo`} />,
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

    return sections.toSorted((a, b) => sectionSortValue(a) - sectionSortValue(b));
  }, [clusterBranding, clusterID, consoleLinks, disableClusterManager, serverURL]);

  const onSelect = () => {
    setIsOpen(false);
  };

  if (applicationSections.length === 0) {
    return null;
  }

  const renderApplicationLauncherGroup = (section: Section, sectionIndex: number) => {
    const appItems = section.actions.map((action) => (
      <DropdownItem
        className="odh-app-launcher__dropdown-item"
        data-testid="application-launcher-item"
        isExternalLink
        key={action.label}
        to={action.href}
        icon={action.image}
      >
        {action.label}
      </DropdownItem>
    ));
    return (
      <React.Fragment key={section.label}>
        <DropdownGroup label={section.label} data-testid="application-launcher-group">
          <DropdownList>{appItems}</DropdownList>
        </DropdownGroup>
        {sectionIndex < applicationSections.length - 1 && <Divider />}
      </React.Fragment>
    );
  };
  return (
    <Dropdown
      aria-label="Application launcher"
      popperProps={{ position: 'right', appendTo: 'inline' }}
      onOpenChange={(isOpenChange) => setIsOpen(isOpenChange)}
      onSelect={onSelect}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="Application launcher"
          variant="plain"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          style={{ width: 'auto' }}
        >
          <ThIcon />
        </MenuToggle>
      )}
      isOpen={isOpen}
      shouldFocusToggleOnSelect
    >
      {applicationSections.map(renderApplicationLauncherGroup)}
    </Dropdown>
  );
};

export default AppLauncher;
