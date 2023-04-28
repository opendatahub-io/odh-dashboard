import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import CustomServingRuntimeListView from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimeListView';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeView: React.FC = () => {
  const {
    servingRuntimeTemplates: { data: servingRuntimeTemplates },
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
      <CustomServingRuntimeListView />
    </ApplicationsPage>
  );
};

export default CustomServingRuntimeView;
