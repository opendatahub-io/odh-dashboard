import React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';
import useInferenceServices from './useInferenceServices';

const ModelServingGlobal: React.FC = () => {
  const [inferenceServices, loaded, loadError] = useInferenceServices();

  return (
    <ApplicationsPage
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loaded={loaded}
      loadError={loadError}
      empty={inferenceServices.length === 0}
      emptyStatePage={<EmptyModelServing />}
      provideChildrenPadding
    >
      <InferenceServiceListView inferenceServices={inferenceServices} />
    </ApplicationsPage>
  );
};

export default ModelServingGlobal;
