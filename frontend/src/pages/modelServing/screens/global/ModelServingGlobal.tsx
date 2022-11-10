import React from 'react';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';
import { ModelServingContext } from '../../ModelServingContext';

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: { data: servingRuntimes },
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ModelServingContext);

  return (
    <ApplicationsPage
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loaded // already checked this in the context provider so loaded is always true here
      empty={servingRuntimes.length === 0 || inferenceServices.length === 0}
      emptyStatePage={<EmptyModelServing />}
      provideChildrenPadding
    >
      <InferenceServiceListView inferenceServices={inferenceServices} />
    </ApplicationsPage>
  );
};

export default ModelServingGlobal;
