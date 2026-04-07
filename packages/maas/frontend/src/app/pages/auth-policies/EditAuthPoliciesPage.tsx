import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const EditAuthPoliciesPage: React.FC = () => (
  <ApplicationsPage
    title="Edit Policy"
    description="Edit an existing policy."
    empty={false}
    loaded
  />
);
export default EditAuthPoliciesPage;
