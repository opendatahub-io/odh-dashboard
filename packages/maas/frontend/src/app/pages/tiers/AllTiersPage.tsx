// basic page layout for all tiers

import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const AllTiersPage: React.FC = () => (
  <ApplicationsPage title="All Tiers" description="View all tiers" empty={false} loaded />
);

export default AllTiersPage;
