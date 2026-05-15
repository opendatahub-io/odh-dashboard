import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import EmptyEndpointsPage from './EmptyEndpointsPage';

const CreateEndpointsPage: React.FC = () => (
  <ApplicationsPage
    title="Create Endpoint"
    empty={false}
    emptyStatePage={<EmptyEndpointsPage />}
    loaded
    data-testid="create-endpoints-page"
  >
    <PageSection isFilled data-testid="create-endpoints-page-section">
      <p data-testid="create-endpoints-page-title">Create Endpoint</p>
    </PageSection>
  </ApplicationsPage>
);
export default CreateEndpointsPage;
