import React from 'react';
import { useNavigate } from 'react-router';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ModelServingContext } from '#~/pages/modelServing/ModelServingContext';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';
import ModelServingProjectSelection from './ModelServingProjectSelection';
import ModelServingLoading from './ModelServingLoading';

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: {
      data: { items: servingRuntimes },
      loaded: servingRuntimesLoaded,
      refresh: refreshServingRuntimes,
    },
    inferenceServices: {
      data: { items: inferenceServices },
      loaded: inferenceServicesLoaded,
      refresh: refreshInferenceServices,
    },
    serverSecrets: { refresh: refreshServerSecrets },
    filterTokens,
    project: currentProject,
    preferredProject,
    projects,
  } = React.useContext(ModelServingContext);

  const navigate = useNavigate();

  const servingPlatformStatuses = useServingPlatformStatuses();
  const { error: notInstalledError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  return (
    <ApplicationsPage
      empty={servingRuntimes.length === 0 || inferenceServices.length === 0}
      emptyStatePage={<EmptyModelServing />}
      title={
        <TitleWithIcon title="Model deployments" objectType={ProjectObjectType.deployedModels} />
      }
      description="Manage and view the health and performance of your deployed models."
      loadError={notInstalledError}
      loaded={servingRuntimesLoaded && inferenceServicesLoaded}
      headerContent={
        <ModelServingProjectSelection
          getRedirectPath={(namespace: string) => `/modelServing/${namespace}`}
        />
      }
      provideChildrenPadding
      loadingContent={
        currentProject ? undefined : (
          <ModelServingLoading
            title="Loading"
            description="Retrieving model data from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject = preferredProject ?? projects?.[0];
              if (redirectProject) {
                navigate(`/modelServing/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <InferenceServiceListView
        inferenceServices={inferenceServices}
        servingRuntimes={servingRuntimes}
        refresh={() => {
          refreshInferenceServices();
          refreshServingRuntimes();
          refreshServerSecrets();
        }}
        filterTokens={filterTokens}
      />
    </ApplicationsPage>
  );
};

export default ModelServingGlobal;
