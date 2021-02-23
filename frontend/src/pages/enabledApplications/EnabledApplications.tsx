import React from 'react';
import { Gallery } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import ApplicationsPage from '../ApplicationsPage';
import OdhAppCard from '../../components/OdhAppCard';

import './EnabledApplications.scss';

const description = `Launch your enabled applications or get started with quick start instructions
 and tasks.`;

const EnabledApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(true);

  const isEmpty = !components || components.length === 0;
  return (
    <ApplicationsPage
      title="Enabled"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
    >
      {!isEmpty ? (
        <Gallery className="odh-installed-apps__gallery" hasGutter>
          {components
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((c) => (
              <OdhAppCard key={c.id} odhApp={c} />
            ))}
        </Gallery>
      ) : null}
    </ApplicationsPage>
  );
};

export default EnabledApplications;
