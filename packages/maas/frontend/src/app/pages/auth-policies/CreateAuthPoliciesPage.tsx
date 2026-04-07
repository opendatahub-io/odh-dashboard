import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const CreateAuthPoliciesPage: React.FC = () => (
  <ApplicationsPage title="Create Policy" description="Create a new policy." empty={false} loaded />
);
export default CreateAuthPoliciesPage;
