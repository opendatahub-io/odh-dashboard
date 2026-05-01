import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import EmptyEndpointsPage from './EmptyEndpointsPage';

const AllEndpointsPage: React.FC = () => (
  <ApplicationsPage
    title="Endpoints"
    empty={false}
    emptyStatePage={<EmptyEndpointsPage />}
    loaded
    data-testid="all-endpoints-page"
  >
    <PageSection isFilled data-testid="all-endpoints-page-section">
      <p>All Endpoints</p>
    </PageSection>
  </ApplicationsPage>
);
export default AllEndpointsPage;
