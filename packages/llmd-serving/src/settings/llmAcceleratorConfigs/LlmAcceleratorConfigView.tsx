import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import LlmAcceleratorConfigListView from './LlmAcceleratorConfigListView';
import LlmAcceleratorConfigEmptyState from './LlmAcceleratorConfigEmptyState';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';

type LlmAcceleratorConfigViewProps = {
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

const LlmAcceleratorConfigView: React.FC<LlmAcceleratorConfigViewProps> = ({ noTitle }) => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <ApplicationsPage
      title="LLM accelerator configurations"
      noTitle={noTitle}
      description="Manage accelerator configurations for LLM inference service deployments. Enabled configurations are available in the deployment wizard."
      loaded
      empty={configs.length === 0}
      emptyStatePage={<LlmAcceleratorConfigEmptyState />}
      provideChildrenPadding
    >
      <LlmAcceleratorConfigListView />
    </ApplicationsPage>
  );
};

export default LlmAcceleratorConfigView;
