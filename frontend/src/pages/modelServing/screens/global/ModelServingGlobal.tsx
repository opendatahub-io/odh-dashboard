import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: { data: servingRuntimes },
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ModelServingContext);

  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = useServingPlatformStatuses();

  const loadError =
    !kServeInstalled && !modelMeshInstalled
      ? new Error('No model serving platform installed')
      : undefined;

  return (
    <ApplicationsPage
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loadError={loadError}
      loaded
      empty={servingRuntimes.length === 0 || inferenceServices.length === 0}
      emptyStatePage={<EmptyModelServing />}
      provideChildrenPadding
    >
      <InferenceServiceListView
        inferenceServices={inferenceServices}
        servingRuntimes={servingRuntimes}
      />
    </ApplicationsPage>
  );
};

export default ModelServingGlobal;
