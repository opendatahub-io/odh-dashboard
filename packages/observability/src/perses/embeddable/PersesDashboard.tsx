import * as React from 'react';
import { Dashboard, DashboardProps } from '@perses-dev/dashboards';

const DEFAULT_EMPTY_DASHBOARD_PROPS = {
  title: 'Empty Dashboard',
  description: 'To get started add something to your dashboard',
};

export type PersesDashboardProps = Omit<DashboardProps, 'emptyDashboardProps'> & {
  emptyDashboardProps?: DashboardProps['emptyDashboardProps'];
};

/**
 * Renders the Perses dashboard panel grid.
 * Must be rendered inside a PersesProvider.
 */
const PersesDashboard: React.FC<PersesDashboardProps> = ({
  emptyDashboardProps = DEFAULT_EMPTY_DASHBOARD_PROPS,
  ...rest
}) => <Dashboard emptyDashboardProps={emptyDashboardProps} {...rest} />;

export default PersesDashboard;
