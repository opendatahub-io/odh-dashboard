import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import * as _ from 'lodash-es';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import ExploreApplicationsList from '~/pages/exploreApplication/ExploreApplicationsList';
import { useWatchComponents } from '~/utilities/useWatchComponents';
import { useQueryParams } from '~/utilities/useQueryParams';
import { OdhApplication } from '~/types';
import { removeQueryArgument, setQueryArgument } from '~/utilities/router';
import GetStartedPanel from '~/pages/exploreApplication/GetStartedPanel';
import { useAppContext } from '~/app/AppContext';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import EnabledApplicationsList from '~/pages/enabledApplications/EnabledApplicationsList';

const description = `View and manage optional applications for your ${ODH_PRODUCT_NAME} instance.`;

const Applications: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const { components, loaded, loadError } = useWatchComponents(false);
  const queryParams = useQueryParams();
  const selectedId = queryParams.get('selectId');
  const [selectedComponent, setSelectedComponent] = React.useState<OdhApplication>();
  const isEmpty = components.length === 0;
  const { dashboardConfig } = useAppContext();
  const { disableInfo } = dashboardConfig.spec.dashboardConfig;
  const [enableApp, setEnableApp] = React.useState<OdhApplication>();

  const updateSelection = React.useCallback(
    (currentSelectedId?: string | null): void => {
      const selection = components.find(
        (c) => c.metadata.name && c.metadata.name === currentSelectedId,
      );
      if (currentSelectedId && selection) {
        setQueryArgument(navigate, 'selectId', currentSelectedId);
        setSelectedComponent(selection);
        return;
      }

      setSelectedComponent(undefined);
      removeQueryArgument(navigate, 'selectId');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [components],
  );

  const exploreComponents = React.useMemo<OdhApplication[]>(
    () =>
      _.cloneDeep(components)
        .filter((component) => !component.spec.hidden)
        .toSorted((a, b) => a.spec.displayName.localeCompare(b.spec.displayName)),
    [components],
  );

  React.useEffect(() => {
    if (components.length > 0) {
      updateSelection(selectedId);
    }
  }, [updateSelection, selectedId, components]);

  if (!tab) {
    return <Navigate to="/applications/enabled" replace />;
  }

  return (
    <Drawer
      data-testid="explore-applications"
      isExpanded={!disableInfo && !!selectedComponent}
      isInline
    >
      <DrawerContent
        panelContent={
          <GetStartedPanel
            onClose={() => updateSelection()}
            selectedApp={selectedComponent}
            onEnable={() => setEnableApp(selectedComponent)}
          />
        }
      >
        <DrawerContentBody className="odh-explore-applications__drawer-body-content">
          <ApplicationsPage
            title={
              <TitleWithIcon
                title="Applications"
                objectType={ProjectObjectType.enabledApplications}
              />
            }
            description={description}
            loaded={loaded}
            empty={isEmpty}
            loadError={loadError}
          >
            <Tabs
              activeKey={tab}
              onSelect={(_event, tabId) => navigate(`/applications/${tabId}`)}
              aria-label="Application tabs"
              role="region"
            >
              <Tab
                eventKey="enabled"
                title={<TabTitleText>Enabled</TabTitleText>}
                aria-label="Enabled"
              >
                <EnabledApplicationsList showDescription />
              </Tab>
              <Tab
                eventKey="explore"
                title={<TabTitleText>Explore</TabTitleText>}
                aria-label="Explore"
              >
                <ExploreApplicationsList
                  showDescription
                  exploreComponents={exploreComponents}
                  selectedComponent={selectedComponent}
                  updateSelection={updateSelection}
                  enableApp={enableApp}
                  setEnableApp={setEnableApp}
                />
              </Tab>
            </Tabs>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default Applications;
