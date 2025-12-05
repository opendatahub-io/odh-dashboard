// basic page layout for all tiers

import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const CreateTierPage: React.FC = () => (
  <ApplicationsPage title="Create Tier" description="Create a new tier" empty={false} loaded />
);

export default CreateTierPage;
