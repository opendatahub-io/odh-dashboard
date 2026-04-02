import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const EditAuthPoliciesPage: React.FC = () => (
  <ApplicationsPage
    title="Edit Auth Policy"
    description="Edit an existing auth policy."
    empty={false}
    loaded
  />
);
export default EditAuthPoliciesPage;
