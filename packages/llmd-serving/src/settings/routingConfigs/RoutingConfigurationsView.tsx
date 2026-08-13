import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import RoutingConfigurationsTable from './RoutingConfigurationsTable';
import EmptyRoutingConfigurations from './EmptyRoutingConfigurations';
import { RoutingConfigContext } from './RoutingConfigContext';

type RoutingConfigurationsViewProps = {
  /**
   * Suppresses the page title when rendered as tab content — the tabbed page
   * already supplies a title and the tab label identifies the section.
   *
   * Only the standalone page passes this as false. After RHOAIENG-80077 removes
   * that page the tab is the only caller, so this prop can go and the title can
   * be suppressed unconditionally.
   * https://issues.redhat.com/browse/RHOAIENG-80077
   */
  noTitle?: boolean;
};

const RoutingConfigurationsView: React.FC<RoutingConfigurationsViewProps> = ({ noTitle }) => {
  const { configs } = React.useContext(RoutingConfigContext);

  return (
    <ApplicationsPage
      title="llm-d routing configurations"
      noTitle={noTitle}
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
