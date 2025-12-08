// basic page layout for all tiers

import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';

const EditTierPage: React.FC = () => (
  <ApplicationsPage title="Edit Tier" description="Edit a tier" empty={false} loaded />
);

export default EditTierPage;
