import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import TopologyConfigurationsTable from './TopologyConfigurationsTable';
import EmptyTopologyConfigurations from './EmptyTopologyConfigurations';
import { TopologyConfigContext } from './TopologyConfigContext';

const TopologyConfigurationsView: React.FC = () => {
  const { configs } = React.useContext(TopologyConfigContext);

  return (
    <ApplicationsPage
      title="llm-d topology configurations"
      noTitle
      description="Manage topology configurations for LLM inference service deployments with llm-d. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      emptyStatePage={<EmptyTopologyConfigurations />}
      provideChildrenPadding
    >
      <TopologyConfigurationsTable configs={configs} />
    </ApplicationsPage>
  );
};

export default TopologyConfigurationsView;
