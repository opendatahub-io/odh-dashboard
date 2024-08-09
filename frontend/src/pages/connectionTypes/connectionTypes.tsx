import React from 'react';
import { PageSection } from '@patternfly/react-core';
import ConnectionTypesCoreApplicationPage from '~/pages/connectionTypes/ConnectionTypesCoreApplicationPage';
import ConnectionTypesList from '~/pages/connectionTypes/ConnectionTypesList';
import {
  connectionTypesPageDescription,
  connectionTypesPageTitle,
} from '~/pages/connectionTypes/const';

const ConnectionTypes: React.FC = () => (
  <ConnectionTypesCoreApplicationPage
    title={connectionTypesPageTitle}
    description={connectionTypesPageDescription}
  >
    <PageSection isFilled variant="light">
      <ConnectionTypesList />
    </PageSection>
  </ConnectionTypesCoreApplicationPage>
);

export default ConnectionTypes;
