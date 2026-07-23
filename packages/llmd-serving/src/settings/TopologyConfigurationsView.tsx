import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import TopologyConfigurationsTable from './TopologyConfigurationsTable';
import EmptyTopologyConfigurations from './EmptyTopologyConfigurations';
import { useWatchTopologyConfigs } from '../api/LLMInferenceServiceConfigs';

const TopologyConfigurationsView: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded, error] = useWatchTopologyConfigs(dashboardNamespace);

  return (
    <ApplicationsPage
      title="llm-d topology configurations"
      description="Manage your llm-d topology configurations. Enabled configurations appear to deployers in the model serving wizard; out-of-the-box configurations can be disabled but not deleted."
      loaded={loaded}
      loadError={error}
      empty={loaded && configs.length === 0}
      emptyStatePage={<EmptyTopologyConfigurations />}
      provideChildrenPadding
    >
      <TopologyConfigurationsTable configs={configs} />
    </ApplicationsPage>
  );
};

export default TopologyConfigurationsView;
