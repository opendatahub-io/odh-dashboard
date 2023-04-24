import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import CustomServingRuntimeListView from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimeListView';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeView: React.FC = () => {
  const {
    servingRuntimeTemplates: { data: servingRuntimeTemplates },
    servingRuntimeTemplateOrder: { data: order },
    refreshData,
  } = React.useContext(CustomServingRuntimeContext);

  return (
    <ApplicationsPage
      title="Serving runtimes"
      description="Manage model serving runtimes"
      loaded
      empty={servingRuntimeTemplates.length === 0}
      emptyStatePage={<EmptyCustomServingRuntime />}
      provideChildrenPadding
    >
      <CustomServingRuntimeListView
        templates={servingRuntimeTemplates}
        templateOrder={order}
        refresh={refreshData}
      />
    </ApplicationsPage>
  );
};

export default CustomServingRuntimeView;
