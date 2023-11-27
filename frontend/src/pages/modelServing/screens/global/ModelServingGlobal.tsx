import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';
import ModelServingProjectSelection from './ModelServingProjectSelection';

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: { data: servingRuntimes, loaded: servingRuntimesLoaded },
    inferenceServices: { data: inferenceServices, loaded: inferenceServicesLoaded },
    project: currentProject,
  } = React.useContext(ModelServingContext);

  const servingPlatformStatuses = useServingPlatformStatuses();
  const { error: notInstalledError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  return (
    <ApplicationsPage
      empty={servingRuntimes.length === 0 || inferenceServices.length === 0}
      emptyStatePage={<EmptyModelServing />}
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loadError={notInstalledError}
      loaded={servingRuntimesLoaded && inferenceServicesLoaded}
      headerContent={
        <ModelServingProjectSelection
          getRedirectPath={(namespace: string) => `/modelServing/${namespace}`}
        />
      }
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
