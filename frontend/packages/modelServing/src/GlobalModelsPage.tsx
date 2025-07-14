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

  const { projects, loaded: projectsLoaded, preferredProject } = React.useContext(ProjectsContext);

  const { namespace } = useParams();
  const navigate = useNavigate();

  const projectsToShow = React.useMemo(() => {
    if (preferredProject) {
      return [preferredProject];
    }
    if (namespace) {
      return projects.filter((project) => project.metadata.name === namespace);
    }
    return projects;
  }, [preferredProject, projects, namespace]);

  React.useEffect(() => {
    if (!namespace && preferredProject) {
      navigate(`/model-serving/${preferredProject.metadata.name}`, { replace: true });
    }
  }, [namespace, preferredProject, navigate]);

  if (!projectsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentsProvider modelServingPlatforms={availablePlatforms} projects={projectsToShow}>
      <GlobalDeploymentsView projects={projectsToShow} />
    </ModelDeploymentsProvider>
  );
};

export default GlobalModelsPage;
