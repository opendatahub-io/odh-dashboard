import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const ViewAuthPoliciesPage: React.FC = () => (
  <ApplicationsPage
    title="View Policy"
    description="View an existing policy."
    empty={false}
    loaded
  />
);
export default ViewAuthPoliciesPage;
