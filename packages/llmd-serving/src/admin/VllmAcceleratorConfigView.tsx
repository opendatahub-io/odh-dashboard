import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import VllmAcceleratorConfigListView from './VllmAcceleratorConfigListView';
import { VllmAcceleratorConfigContext } from './VllmAcceleratorConfigContext';

const VllmAcceleratorConfigView: React.FC = () => {
  const { configs } = React.useContext(VllmAcceleratorConfigContext);

  return (
    <ApplicationsPage
      title="vLLM accelerator configurations"
      description="Manage your vLLM accelerator configurations. Enabled configurations appear to deployers in the model serving wizard; out-of-the-box configurations can be disabled but not deleted."
      loaded
      empty={configs.length === 0}
      provideChildrenPadding
    >
      <VllmAcceleratorConfigListView />
    </ApplicationsPage>
  );
};

export default VllmAcceleratorConfigView;
