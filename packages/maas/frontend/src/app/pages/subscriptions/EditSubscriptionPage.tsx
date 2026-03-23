import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const EditSubscriptionPage: React.FC = () => (
  <ApplicationsPage title="Edit subscription" empty={false} loaded />
);

export default EditSubscriptionPage;
