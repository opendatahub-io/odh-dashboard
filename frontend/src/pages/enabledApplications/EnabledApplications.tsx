import * as React from 'react';
import * as _ from 'lodash';
import { Gallery, PageSection } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import { OdhApplication } from '../../types';
import ApplicationsPage from '../ApplicationsPage';
import OdhAppCard from '../../components/OdhAppCard';
import QuickStarts from '../../App/QuickStarts';

import './EnabledApplications.scss';

const description = `Launch your enabled applications or get started with quick start instructions
 and tasks.`;

type EnabledApplicationsInnerProps = {
  loaded: boolean;
  loadError?: Error;
  components: OdhApplication[];
};
const EnabledApplicationsInner: React.FC<EnabledApplicationsInnerProps> = React.memo(
  ({ loaded, loadError, components }) => {
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
                {components.map((c) => (
                  <OdhAppCard key={c.metadata.name} odhApp={c} />
                ))}
              </Gallery>
            </PageSection>
          ) : null}
        </ApplicationsPage>
      </QuickStarts>
    );
  },
);
EnabledApplicationsInner.displayName = 'EnabledApplicationsInner';

const EnabledApplications: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(true);

  const sortedComponents = React.useMemo(() => {
    return _.cloneDeep(components).sort((a, b) =>
      a.spec.displayName.localeCompare(b.spec.displayName),
    );
  }, [components]);

  return (
    <QuickStarts>
      <EnabledApplicationsInner
        loaded={loaded}
        components={sortedComponents}
        loadError={loadError}
      />
    </QuickStarts>
  );
};

export default EnabledApplications;
