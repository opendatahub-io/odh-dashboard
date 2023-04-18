import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: { data: servingRuntimes },
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ModelServingContext);

  return (
    <ApplicationsPage
      title="Model serving"
      description="Manage and view the health and performance of your deployed models."
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
