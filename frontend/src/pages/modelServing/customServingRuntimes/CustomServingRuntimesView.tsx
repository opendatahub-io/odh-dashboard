import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import CustomServingRuntimesListView from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimesListView';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimesView: React.FC = () => {
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
      <CustomServingRuntimesListView
        templates={servingRuntimeTemplates}
        templateOrder={order}
        refresh={refreshData}
      />
    </ApplicationsPage>
  );
};

export default CustomServingRuntimesView;
