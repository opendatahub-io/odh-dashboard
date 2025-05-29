import React from 'react';
import { PageSection } from '@patternfly/react-core';
import ConnectionTypesTable from '#~/pages/connectionTypes/ConnectionTypesTable';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import EmptyConnectionTypes from '#~/pages/connectionTypes/EmptyConnectionTypes';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

const ConnectionTypesPage: React.FC = () => {
  const [connectionTypes, loaded, loadError, refresh] = useWatchConnectionTypes();

  return (
    <ApplicationsPage
      loaded={loaded}
      loadError={loadError}
      empty={loaded && !connectionTypes.length}
      emptyStatePage={<EmptyConnectionTypes />}
      title={
        <TitleWithIcon title="Connection types" objectType={ProjectObjectType.dataConnection} />
      }
      description="Create and manage connection types for users in your organization. Connection types include customizable fields and optional default values to decrease the time required to add connections to data sources and sinks."
      errorMessage="Unable to load connection types"
    >
      <PageSection isFilled>
        <ConnectionTypesTable connectionTypes={connectionTypes} onUpdate={refresh} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ConnectionTypesPage;
