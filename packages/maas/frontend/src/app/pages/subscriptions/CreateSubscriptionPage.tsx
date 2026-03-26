import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const CreateSubscriptionPage: React.FC = () => (
  <ApplicationsPage title="Create subscription" empty={false} loaded />
);

export default CreateSubscriptionPage;
