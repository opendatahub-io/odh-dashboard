import * as React from 'react';
import { Dashboard } from '@perses-dev/dashboards';

/**
 * Perses Dashboard component - renders the actual dashboard
 */
const PersesBoard: React.FC = () => (
  <Dashboard
    emptyDashboardProps={{
      title: 'Empty Dashboard',
      description: 'To get started add something to your dashboard',
    }}
  />
);

export default PersesBoard;
