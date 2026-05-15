import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import EmptyEndpointsPage from './EmptyEndpointsPage';

const EditEndpointsPage: React.FC = () => (
  <ApplicationsPage
    title="Edit Endpoint"
    empty={false}
    emptyStatePage={<EmptyEndpointsPage />}
    loaded
  >
    <PageSection isFilled>
      <p>Edit Endpoint</p>
    </PageSection>
  </ApplicationsPage>
);
export default EditEndpointsPage;
