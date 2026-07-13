import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import EmptyExternalModelsPage from './EmptyExternalModelsPage';

const AllExternalModelsPage: React.FC = () => (
  <ApplicationsPage
    title="Endpoints"
    loaded
    empty={false}
    emptyStatePage={<EmptyExternalModelsPage />}
    data-testid="all-endpoints-page"
  >
    <PageSection isFilled data-testid="all-endpoints-page-section">
      <p>All External Models</p>
    </PageSection>
  </ApplicationsPage>
);
export default AllExternalModelsPage;
