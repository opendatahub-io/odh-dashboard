import * as React from 'react';
import _ from 'lodash';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { OdhApplication } from '~/types';
import { useWatchComponents } from '~/utilities/useWatchComponents';
import {
  Bullseye,
} from '@patternfly/react-core';
import EmptyModelRegistry from './EmptyModelRegistry';

type EdgeModelRegistryInnerProps = {
  loaded: boolean;
  loadError?: Error;
  components: OdhApplication[];
};

const EdgeModelRegistryInner: React.FC<EdgeModelRegistryInnerProps> = React.memo(({ loaded, loadError, components }) => {

  return (
    <ApplicationsPage
      title="Model registry"
      description={''}
      loaded={true}
      empty={false}
    >
      <Bullseye>
        <EmptyModelRegistry />
      </Bullseye>
    </ApplicationsPage>
  )
})

EdgeModelRegistryInner.displayName = 'EdgeModelRegistryInner';

const EdgeModelRegistry: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(true);

  const sortedComponents = React.useMemo(
    () =>
      _.cloneDeep(components).sort((a, b) => a.spec.displayName.localeCompare(b.spec.displayName)),
    [components],
  );


  return (
    <EdgeModelRegistryInner loaded={loaded} components={sortedComponents} loadError={loadError} />
  );
};

export default EdgeModelRegistry;