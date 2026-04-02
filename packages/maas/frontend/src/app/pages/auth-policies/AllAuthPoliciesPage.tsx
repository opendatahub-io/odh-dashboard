import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const AllAuthPoliciesPage: React.FC = () => (
  <ApplicationsPage
    title="Auth Policies"
    description="Auth Policies are used to control access to the API."
    empty={false}
    loaded
  />
);
export default AllAuthPoliciesPage;
