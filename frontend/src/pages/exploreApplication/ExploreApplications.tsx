import * as React from 'react';
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
import { useHistory } from 'react-router';

import './ExploreApplications.scss';

const description = `Add optional applications to your Open Data Hub instance.`;

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
    return (
      <ApplicationsPage
        title="Explore"
        description={description}
        loaded={loaded}
        empty={isEmpty}
        loadError={loadError}
      >
        {!isEmpty ? (
          <Drawer isExpanded={!!selectedComponent} isInline>
            <DrawerContent
              panelContent={
                <GetStartedPanel
                  onClose={() => updateSelection()}
                  selectedApp={selectedComponent}
                />
              }
            >
              <DrawerContentBody className="odh-explore-apps__body">
                <PageSection>
                  <Gallery className="odh-explore-apps__gallery" hasGutter>
                    {exploreComponents.map((c) => (
                      <OdhExploreCard
                        key={c.metadata.name}
                        odhApp={c}
                        isSelected={selectedComponent === c}
                        onSelect={() => updateSelection(c.metadata.name)}
                      />
                    ))}
                  </Gallery>
                </PageSection>
              </DrawerContentBody>
            </DrawerContent>
          </Drawer>
        ) : null}
      </ApplicationsPage>
    );
  },
);
ExploreApplicationsInner.displayName = 'ExploreApplicationsInner';

const ExploreApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(false);
  const history = useHistory();
  const queryParams = useQueryParams();
  const selectedId = queryParams.get('selectId');
  const [selectedComponent, setSelectedComponent] = React.useState<OdhApplication>();
  const isEmpty = !components || components.length === 0;

  const updateSelection = React.useCallback(
    (selectedId?: string | null): void => {
      const selection = components.find((c) => c.metadata.name && c.metadata.name === selectedId);
      if (selectedId && selection) {
        setQueryArgument(history, 'selectId', selectedId);
        setSelectedComponent(selection);
        return;
      }

      setSelectedComponent(undefined);
      removeQueryArgument(history, 'selectId');
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
