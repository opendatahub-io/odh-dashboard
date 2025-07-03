import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import GlobalDeploymentsView from './components/global/GlobalDeploymentsView';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import { isModelServingPlatformExtension } from '../extension-points';

const GlobalModelsPage: React.FC = () => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);

  const {
    projects,
    loaded: projectsLoaded,
    preferredProject: currentProject,
  } = React.useContext(ProjectsContext);

  const selectedProject = currentProject
    ? projects.find((project) => project.metadata.name === currentProject.metadata.name)
    : null;
  const projectsToShow = selectedProject ? [selectedProject] : projects;
  const { namespace } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!namespace && currentProject) {
      navigate(`/model-serving/${currentProject.metadata.name}`, { replace: true });
    }
  }, [namespace, currentProject, navigate]);

  if (!projectsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentsProvider modelServingPlatforms={availablePlatforms} projects={projectsToShow}>
      <GlobalDeploymentsView currentProject={selectedProject} />
    </ModelDeploymentsProvider>
  );
};

export default GlobalModelsPage;
