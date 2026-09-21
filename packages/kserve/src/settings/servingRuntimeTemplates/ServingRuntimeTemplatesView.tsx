import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import CustomServingRuntimeListView from './CustomServingRuntimeListView';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const ServingRuntimeTemplatesView: React.FC = () => {
  const {
    servingRuntimeTemplates: [servingRuntimeTemplates],
  } = React.useContext(CustomServingRuntimeContext);

  return (
    <ApplicationsPage
      title="Serving runtime templates"
      noTitle
      description="Manage your serving runtime templates. Enabled templates appear to deployers in the model serving wizard; out-of-the-box templates can be disabled but not deleted."
      loaded
      empty={servingRuntimeTemplates.length === 0}
      emptyStatePage={<EmptyCustomServingRuntime />}
      provideChildrenPadding
    >
      <CustomServingRuntimeListView />
    </ApplicationsPage>
  );
};

export default ServingRuntimeTemplatesView;
