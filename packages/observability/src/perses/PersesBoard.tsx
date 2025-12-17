import * as React from 'react';
import { Dashboard, DashboardStickyToolbar } from '@perses-dev/dashboards';

/**
 * Perses Dashboard component - renders the actual dashboard with variable controls
 */
const PersesBoard: React.FC = () => (
  <>
    <DashboardStickyToolbar initialVariableIsSticky={false} />
    <Dashboard
      emptyDashboardProps={{
        title: 'Empty Dashboard',
        description: 'To get started add something to your dashboard',
      }}
    />
  </>
);

export default PersesBoard;
