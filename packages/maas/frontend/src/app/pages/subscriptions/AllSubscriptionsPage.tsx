import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const AllSubscriptionsPage: React.FC = () => (
  <ApplicationsPage title="Subscriptions" empty={false} loaded />
);

export default AllSubscriptionsPage;
