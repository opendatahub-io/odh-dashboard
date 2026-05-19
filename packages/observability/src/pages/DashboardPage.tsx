import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- Host shell wrapper for federated observability routes
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { AreaContext } from '@odh-dashboard/internal/concepts/areas/AreaContext';
import DashboardContent from './DashboardContent';
import { DASHBOARD_PAGE_TITLE, DASHBOARD_PAGE_DESCRIPTION } from './const';
import { usePersesDashboards } from '../api/usePersesDashboards';
import { getMonitoringStackSignal } from '../utils/monitoringStackStatus';

const MONITORING_UNAVAILABLE_FALLBACK =
  'Check the DSCInitialization status conditions for details.';

const PERSES_LOAD_ERROR_TITLE = 'Unable to reach observability dashboards';

const NO_DASHBOARDS_HINT =
  'No dashboard definitions were returned. If this is unexpected, verify Perses and the monitoring stack are configured.';

const DashboardPage: React.FC = () => {
  const { dsciStatus } = React.useContext(AreaContext);
  const monitoringSignal = React.useMemo(() => getMonitoringStackSignal(dsciStatus), [dsciStatus]);
  const skipPersesList = monitoringSignal.kind === 'unavailable';

  const { dashboards, loaded, error } = usePersesDashboards({
    fetchDashboardList: !skipPersesList,
  });

  if (monitoringSignal.kind === 'unavailable') {
    const subtext =
      monitoringSignal.operatorMessage ??
      monitoringSignal.reason ??
      MONITORING_UNAVAILABLE_FALLBACK;

    return (
      <ApplicationsPage
        title={DASHBOARD_PAGE_TITLE}
        description={DASHBOARD_PAGE_DESCRIPTION}
        loaded
        empty
        emptyMessage={monitoringSignal.headline}
        subtext={subtext}
      />
    );
  }

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
      emptyMessage="No dashboards found."
      subtext={monitoringSignal.kind === 'unknown' ? NO_DASHBOARDS_HINT : undefined}
    />
  );
};

export default DashboardPage;
