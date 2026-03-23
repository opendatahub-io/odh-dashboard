import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const ViewSubscriptionPage: React.FC = () => (
  <ApplicationsPage title="View subscription" empty={false} loaded />
);

export default ViewSubscriptionPage;
