import * as React from 'react';
import { ProjectKind } from '../../k8sTypes';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import useProject from './useProject';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type ProjectDetailsContextType = {
  currentProject: ProjectKind;
};

export const ProjectDetailsContext = React.createContext<ProjectDetailsContextType>({
  // We never will get into a case without a project, so fudge the default value
  currentProject: null as unknown as ProjectKind,
});

const ProjectDetailsContextProvider: React.FC = ({ children }) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [project, loaded, error] = useProject(namespace);

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Problem loading project details
          </Title>
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            View my projects
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!loaded || !project) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ProjectDetailsContext.Provider value={{ currentProject: project }}>
      {children}
    </ProjectDetailsContext.Provider>
  );
};

export default ProjectDetailsContextProvider;
