import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- Host shell wrapper for federated observability routes
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardContent from './DashboardContent';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import { usePersesDashboards } from '../api/usePersesDashboards';

const PERSES_LOAD_ERROR_TITLE = 'Unable to reach observability dashboards';

const NO_DASHBOARDS_MESSAGE =
  'No dashboards were found. Verify that the monitoring stack is configured correctly.';

const DashboardPage: React.FC = () => {
  const { dashboards, loaded, error } = usePersesDashboards();

  if (error) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty={false}
        loadError={error}
        errorMessage={PERSES_LOAD_ERROR_TITLE}
      />
    );
  }

  if (!loaded) {
    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded={false}
        empty={false}
      />
    );
  }

  if (dashboards.length > 0) {
    return <DashboardContent dashboards={dashboards} />;
  }

  return (
    <ApplicationsPage
      title={DASHBOARD_PAGE_TITLE}
      description={DASHBOARD_PAGE_DESCRIPTION}
      loaded
      empty
      emptyMessage={NO_DASHBOARDS_MESSAGE}
    />
  );
};

export default DashboardPage;
