import React from 'react';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import ModelDeploymentWizard from './ModelDeploymentWizard';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { ModelDeploymentsProvider } from '../../concepts/ModelDeploymentsContext';

const CreateModelDeploymentPage: React.FC = () => {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const currentProject = projects.find(byName(namespace));
  const [connections, connectionsLoaded] = useServingConnections(
    currentProject?.metadata.name ?? '',
  );
  const [connectionTypes] = useWatchConnectionTypes(true);
  const [selectedConnection, setSelectedConnection] = React.useState<Connection | undefined>(
    undefined,
  );

  const { clusterPlatforms, clusterPlatformsLoaded, clusterPlatformsError } =
    useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(currentProject, clusterPlatforms);

  if (!projectsLoaded || !clusterPlatformsLoaded || !connectionsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!currentProject || !activePlatform || clusterPlatformsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h4"
          icon={ExclamationCircleIcon}
          titleText="Unable to create model deployment"
        >
          <EmptyStateBody>{`Project ${namespace ?? ''} not found.`}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => navigate(`/modelServing/`)}>
                Return to model serving
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <ModelDeploymentsProvider projects={[currentProject]}>
      <ModelDeploymentWizard
        title="Deploy a model"
        description="Configure and deploy your model."
        primaryButtonText="Deploy model"
        project={currentProject}
        modelServingPlatform={activePlatform}
        connections={connections}
        selectedConnection={selectedConnection}
        connectionTypes={connectionTypes}
        setSelectedConnection={setSelectedConnection}
      />
    </ModelDeploymentsProvider>
  );
};

export default CreateModelDeploymentPage;
