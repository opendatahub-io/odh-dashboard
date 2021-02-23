import React from 'react';
import { Gallery } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import OdhExploreCard from '../../components/OdhExploreCard';
import ApplicationsPage from '../ApplicationsPage';

const description = `This is a catalog of all the third-party supported optional programs you can
 add to your Managed Open Data Hub instance.`;

const ExploreApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(false);
  const [selectedComponent, setSelectedComponent] = React.useState<string>();
  const isEmpty = !components || components.length === 0;
  return (
    <ApplicationsPage
      title="Explore"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
    >
      {!isEmpty ? (
        <Gallery className="odh-explore-apps__gallery" hasGutter>
          {components
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((c) => (
              <OdhExploreCard
                key={c.id}
                odhApp={c}
                isSelected={selectedComponent === c.label}
                onSelect={() => setSelectedComponent(c.label)}
              />
            ))}
        </Gallery>
      ) : null}
    </ApplicationsPage>
  );
};

export default ExploreApplications;
