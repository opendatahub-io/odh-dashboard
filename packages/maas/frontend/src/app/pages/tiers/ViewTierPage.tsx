// basic page layout for all tiers

import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const ViewTierPage: React.FC = () => (
  <ApplicationsPage title="View Tier" description="View a tier" empty={false} loaded />
);

export default ViewTierPage;
