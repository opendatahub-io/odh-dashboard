import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import NotFound from '~/pages/NotFound';
import { InferenceServiceKind, ProjectKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

type ProjectModelMetricsPathWrapperProps = {
  children: (
    inferenceService: InferenceServiceKind,
    currentProject: ProjectKind,
  ) => React.ReactNode;
};

const ProjectModelMetricsPathWrapper: React.FC<ProjectModelMetricsPathWrapperProps> = ({
  children,
}) => {
  const { inferenceService: modelName } = useParams<{
    inferenceService: string;
  }>();
  const {
    currentProject,
    inferenceServices: {
      data: { items: models },
      loaded,
    },
  } = React.useContext(ProjectDetailsContext);
  const model = models.find((currentModel) => currentModel.metadata.name === modelName);
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!model) {
    return <NotFound />;
  }

  return <>{children(model, currentProject)}</>;
};

export default ProjectModelMetricsPathWrapper;
