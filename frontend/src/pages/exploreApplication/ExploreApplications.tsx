import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import * as _ from 'lodash';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Gallery,
  PageSection,
} from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import OdhExploreCard from '../../components/OdhExploreCard';
import ApplicationsPage from '../ApplicationsPage';
import { OdhApplication } from '../../types';
import GetStartedPanel from './GetStartedPanel';
import { useQueryParams } from '../../utilities/useQueryParams';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { fireTrackingEvent } from '../../utilities/segmentIOUtils';
import { ODH_PRODUCT_NAME } from '../../utilities/const';
import { useAppContext } from '../../app/AppContext';

import './ExploreApplications.scss';

const description = `Add optional applications to your ${ODH_PRODUCT_NAME} instance.`;
const disabledDescription = `View optional applications for your ${ODH_PRODUCT_NAME} instance. Contact an administrator to install these applications.`;

type ExploreApplicationsInnerProps = {
  loaded: boolean;
  isEmpty: boolean;
  loadError?: Error;
  exploreComponents: OdhApplication[];
  selectedComponent?: OdhApplication;
  updateSelection: (selectedId?: string | null) => void;
};

const ExploreApplicationsInner: React.FC<ExploreApplicationsInnerProps> = React.memo(
  ({ loaded, isEmpty, loadError, exploreComponents, selectedComponent, updateSelection }) => {
    const { dashboardConfig } = useAppContext();
    const disableInfo = dashboardConfig.spec.dashboardConfig.disableInfo;
    const bodyClasses = classNames('odh-explore-apps__body', {
      'm-side-panel-open': !!selectedComponent,
    });
    const [enableApp, setEnableApp] = React.useState<OdhApplication>();

    return (
      <Drawer
        data-id="explore-applications"
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
          <DrawerContentBody className={bodyClasses}>
            <ApplicationsPage
              title="Explore"
              description={disableInfo ? disabledDescription : description}
              loaded={loaded}
              empty={isEmpty}
              loadError={loadError}
            >
              <PageSection isFilled data-id="page-content">
                <Gallery maxWidths={{ default: '330px' }} role="list" hasGutter>
                  {exploreComponents.map((c) => (
                    <OdhExploreCard
                      key={c.metadata.name}
                      odhApp={c}
                      isSelected={selectedComponent?.metadata.name === c.metadata.name}
                      onSelect={() => {
                        updateSelection(c.metadata.name);
                        fireTrackingEvent('Explore card clicked', {
                          name: c.metadata.name,
                        });
                      }}
                      disableInfo={disableInfo}
                      enableOpen={c.metadata.name === enableApp?.metadata.name}
                      onEnableClose={() => setEnableApp(undefined)}
                    />
                  ))}
                </Gallery>
              </PageSection>
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    );
  },
);
ExploreApplicationsInner.displayName = 'ExploreApplicationsInner';

const ExploreApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(false);
  const navigate = useNavigate();
  const queryParams = useQueryParams();
  const selectedId = queryParams.get('selectId');
  const [selectedComponent, setSelectedComponent] = React.useState<OdhApplication>();
  const isEmpty = !components || components.length === 0;

  const updateSelection = React.useCallback(
    (selectedId?: string | null): void => {
      const selection = components.find((c) => c.metadata.name && c.metadata.name === selectedId);
      if (selectedId && selection) {
        setQueryArgument(navigate, 'selectId', selectedId);
        setSelectedComponent(selection);
        return;
      }

      setSelectedComponent(undefined);
      removeQueryArgument(navigate, 'selectId');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [components],
  );

  const exploreComponents = React.useMemo<OdhApplication[]>(() => {
    return _.cloneDeep(components).sort((a, b) =>
      a.spec.displayName.localeCompare(b.spec.displayName),
    );
  }, [components]);

  React.useEffect(() => {
    if (components?.length > 0) {
      updateSelection(selectedId);
    }
  }, [updateSelection, selectedId, components]);

  return (
    <ExploreApplicationsInner
      loaded={loaded}
      isEmpty={isEmpty}
      loadError={loadError}
      exploreComponents={exploreComponents}
      selectedComponent={selectedComponent}
      updateSelection={updateSelection}
    />
  );
};

export default ExploreApplications;
