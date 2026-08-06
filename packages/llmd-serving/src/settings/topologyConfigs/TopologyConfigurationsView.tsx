import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import TopologyConfigurationsTable from './TopologyConfigurationsTable';
import EmptyTopologyConfigurations from './EmptyTopologyConfigurations';
import { TopologyConfigContext } from './TopologyConfigContext';

type TopologyConfigurationsViewProps = {
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

const TopologyConfigurationsView: React.FC<TopologyConfigurationsViewProps> = ({ noTitle }) => {
  const { configs } = React.useContext(TopologyConfigContext);

  return (
    <ApplicationsPage
      title="llm-d topology configurations"
      noTitle={noTitle}
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
