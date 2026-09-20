import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import RoutingConfigurationsTable from './RoutingConfigurationsTable';
import EmptyRoutingConfigurations from './EmptyRoutingConfigurations';
import { RoutingConfigContext } from './RoutingConfigContext';

const RoutingConfigurationsView: React.FC = () => {
  const { configs } = React.useContext(RoutingConfigContext);

  return (
    <ApplicationsPage
      title="llm-d routing configurations"
      noTitle
      description="Manage routing configurations for LLM inference service deployments. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      emptyStatePage={<EmptyRoutingConfigurations />}
      provideChildrenPadding
    >
      <RoutingConfigurationsTable configs={configs} />
    </ApplicationsPage>
  );
};

export default RoutingConfigurationsView;
