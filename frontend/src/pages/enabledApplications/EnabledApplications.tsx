import React from 'react';
import { Gallery, PageSection } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import ApplicationsPage from '../ApplicationsPage';
import OdhAppCard from '../../components/OdhAppCard';
import QuickStarts from '../../app/QuickStarts';

import './EnabledApplications.scss';

const description = `Launch your enabled applications or get started with quick start instructions
 and tasks.`;

const EnabledApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(true);

  const isEmpty = !components || components.length === 0;
  return (
    <QuickStarts>
      <ApplicationsPage
        title="Enabled"
        description={description}
        loaded={loaded}
        empty={isEmpty}
        loadError={loadError}
      >
        {!isEmpty ? (
          <PageSection>
            <Gallery className="odh-installed-apps__gallery" hasGutter>
              {components
                .sort((a, b) => a.spec.displayName.localeCompare(b.spec.displayName))
                .map((c) => (
                  <OdhAppCard key={c.metadata.name} odhApp={c} />
                ))}
            </Gallery>
          </PageSection>
        ) : null}
      </ApplicationsPage>
    </QuickStarts>
  );
};

export default EnabledApplications;
