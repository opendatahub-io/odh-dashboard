import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import InvalidProject from '~/concepts/projects/InvalidProject';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import EmptyModelServing from './EmptyModelServing';
import InferenceServiceListView from './InferenceServiceListView';
import ModelServingProjectSelection from './ModelServingProjectSelection';
import ModelServingNoProjects from './ModelServingNoProjects';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const ModelServingGlobal: React.FC = () => {
  const {
    servingRuntimes: { data: servingRuntimes },
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ModelServingContext);
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  const getRedirectPath = (projectName: string) => `/modelServing/${projectName}`;

  const { namespace } = useParams<{ namespace: string }>();
  const currentProject = projects.find(byName(namespace));
  const servingPlatformStatuses = useServingPlatformStatuses();
  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = servingPlatformStatuses;

  const { error: notInstalledError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  const loadError =
    !kServeInstalled && !modelMeshInstalled
      ? new Error('No model serving platform installed')
      : notInstalledError;

  let renderStateProps: ApplicationPageRenderState = {
    empty: false,
    emptyStatePage: undefined,
  };

  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <ModelServingNoProjects />,
    };
  } else {
    if (servingRuntimes.length === 0 || inferenceServices.length === 0) {
      renderStateProps = {
        empty: true,
        emptyStatePage: <EmptyModelServing />,
      };
    }
    if (namespace) {
      if (!currentProject) {
        renderStateProps = {
          empty: true,
          emptyStatePage: (
            <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
          ),
        };
      }
    } else {
      // Redirect the namespace suffix into the URL
      if (preferredProject) {
        return <Navigate to={getRedirectPath(preferredProject.metadata.name)} replace />;
      }
    }
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title="Deployed models"
      description="Manage and view the health and performance of your deployed models."
      loadError={loadError}
      loaded
      headerContent={<ModelServingProjectSelection getRedirectPath={getRedirectPath} />}
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
