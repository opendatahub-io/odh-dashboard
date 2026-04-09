import * as React from 'react';
import { Dashboard, DashboardStickyToolbar } from '@perses-dev/dashboards';

const PersesBoard: React.FC = () => (
  <div>
    <DashboardStickyToolbar initialVariableIsSticky={false} />
    <Dashboard
      emptyDashboardProps={{
        title: 'Empty Dashboard',
        description: 'To get started add something to your dashboard',
      }}
    />
  </div>
);

export default PersesBoard;
