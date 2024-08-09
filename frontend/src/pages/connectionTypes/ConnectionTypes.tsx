import React from 'react';
import { PageSection } from '@patternfly/react-core';
import {
  connectionTypesPageDescription,
  connectionTypesPageTitle,
} from '~/pages/connectionTypes/const';
import ConnectionTypesTable from '~/pages/connectionTypes/ConnectionTypesTable';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import EmptyConnectionTypes from '~/pages/connectionTypes/EmptyConnectionTypes';

const ConnectionTypes: React.FC = () => {
  const { connectionTypes, loaded, loadError, forceRefresh } = useWatchConnectionTypes();

  return (
    <ApplicationsPage
      loaded={loaded}
      loadError={loadError}
      empty={loaded && !connectionTypes.length}
      emptyStatePage={<EmptyConnectionTypes />}
      title={connectionTypesPageTitle}
      description={connectionTypesPageDescription}
    >
      <PageSection isFilled variant="light">
        <ConnectionTypesTable connectionTypes={connectionTypes} onUpdate={forceRefresh} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ConnectionTypes;
