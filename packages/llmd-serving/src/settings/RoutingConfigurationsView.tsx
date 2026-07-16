import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import RoutingConfigurationsTable from './RoutingConfigurationsTable';
import EmptyRoutingConfigurations from './EmptyRoutingConfigurations';
import { useWatchRouterConfigs } from '../api/LLMInferenceServiceConfigs';

const RoutingConfigurationsView: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded, error] = useWatchRouterConfigs(dashboardNamespace);

  return (
    <ApplicationsPage
      title="llm-d routing configurations"
      description="Manage llm-d routing configurations. Enabled configurations can be selected when deploying models with advanced routing."
      loaded={loaded}
      loadError={error}
      empty={loaded && configs.length === 0}
      emptyStatePage={<EmptyRoutingConfigurations />}
      provideChildrenPadding
    >
      <RoutingConfigurationsTable configs={configs} />
    </ApplicationsPage>
  );
};

export default RoutingConfigurationsView;
