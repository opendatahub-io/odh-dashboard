import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import NotFound from '~/pages/NotFound';
import { InferenceServiceKind, ProjectKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

type ProjectInferenceMetricsPathWrapperProps = {
  children: (
    inferenceService: InferenceServiceKind,
    currentProject: ProjectKind,
  ) => React.ReactNode;
};

const ProjectInferenceMetricsPathWrapper: React.FC<ProjectInferenceMetricsPathWrapperProps> = ({
  children,
}) => {
  const { inferenceService: modelName } = useParams<{
    inferenceService: string;
  }>();
  const {
    currentProject,
    inferenceServices: { data: models, loaded },
  } = React.useContext(ProjectDetailsContext);
  const inferenceService = models.find((model) => model.metadata.name === modelName);
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!inferenceService) {
    return <NotFound />;
  }

  return <>{children(inferenceService, currentProject)}</>;
};

export default ProjectInferenceMetricsPathWrapper;
