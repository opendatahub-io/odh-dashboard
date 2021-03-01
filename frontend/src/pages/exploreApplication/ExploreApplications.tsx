import React from 'react';
import { Gallery } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import OdhExploreCard from '../../components/OdhExploreCard';
import ApplicationsPage from '../ApplicationsPage';

const description = `Add optional programs to your Red Hat OpenShift Data Science instance.`;

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
            .sort((a, b) => a.spec.displayName.localeCompare(b.spec.displayName))
            .map((c) => (
              <OdhExploreCard
                key={c.metadata.name}
                odhApp={c}
                isSelected={selectedComponent === c.metadata.name}
                onSelect={() => setSelectedComponent(c.metadata.name)}
              />
            ))}
        </Gallery>
      ) : null}
    </ApplicationsPage>
  );
};

export default ExploreApplications;
