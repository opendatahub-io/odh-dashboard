import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardContent from './DashboardContent';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import { useClusterObservabilityDashboards } from '../api/usePersesDashboards';
import { sortDashboardsByPriority } from '../utils/dashboardUtils';

const DashboardPage: React.FC = () => {
  const { dashboards, loaded, error } = useClusterObservabilityDashboards();

  const sortedDashboards = sortDashboardsByPriority(dashboards);

  const emptyStatePage = (
    <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No dashboards found">
      <EmptyStateBody>No dashboards found.</EmptyStateBody>
    </EmptyState>
  );

  // When we have valid dashboards, render with tabs
  if (loaded && !error && sortedDashboards.length > 0) {
    return <DashboardContent dashboards={sortedDashboards} />;
  }

  // Loading, error, or empty states - render without PersesWrapper
  return (
    <ApplicationsPage
      title={DASHBOARD_PAGE_TITLE}
      description={DASHBOARD_PAGE_DESCRIPTION}
      loaded={loaded}
      loadError={error}
      empty={sortedDashboards.length === 0}
      emptyStatePage={emptyStatePage}
    />
  );
};

export default DashboardPage;
