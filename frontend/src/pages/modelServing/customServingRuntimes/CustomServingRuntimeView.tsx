import * as React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import CustomServingRuntimeListView from '#~/pages/modelServing/customServingRuntimes/CustomServingRuntimeListView';
import CustomServingRuntimeHeaderLabels from '#~/pages/modelServing/customServingRuntimes/CustomServingRuntimeHeaderLabels';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeView: React.FC = () => {
  const {
    servingRuntimeTemplates: [servingRuntimeTemplates],
  } = React.useContext(CustomServingRuntimeContext);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Serving runtimes" objectType={ProjectObjectType.servingRuntime} />
      }
      description="Manage your model serving runtimes."
      loaded
      empty={servingRuntimeTemplates.length === 0}
      emptyStatePage={<EmptyCustomServingRuntime />}
      provideChildrenPadding
      headerContent={<CustomServingRuntimeHeaderLabels />}
    >
      <CustomServingRuntimeListView />
    </ApplicationsPage>
  );
};

export default CustomServingRuntimeView;
