import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardContent from './DashboardContent';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import { usePersesDashboards } from '../api/usePersesDashboards';

const DashboardPage: React.FC = () => {
  const { dashboards, loaded, error } = usePersesDashboards();

  // When we have valid dashboards, render with tabs
  if (loaded && !error && dashboards.length > 0) {
    return <DashboardContent dashboards={dashboards} />;
  }

  // Loading, error, or empty states - render without PersesWrapper
  return (
    <ApplicationsPage
      title={DASHBOARD_PAGE_TITLE}
      description={DASHBOARD_PAGE_DESCRIPTION}
      loaded={loaded}
      loadError={error}
      empty={dashboards.length === 0}
      emptyMessage="No dashboards found."
    />
  );
};

export default DashboardPage;
