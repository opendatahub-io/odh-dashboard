import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { PyTorchJobKind } from '../../k8sTypes';

type TrainingJobProjectProps = {
  trainingJob: PyTorchJobKind;
};

const TrainingJobProject: React.FC<TrainingJobProjectProps> = ({ trainingJob }) => {
  const { projects, loaded, loadError } = React.useContext(ProjectsContext);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">
          Failed to get project for this training job. {loadError.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  const project = projects.find(byName(trainingJob.metadata.namespace));

  return <>{project ? getDisplayNameFromK8sResource(project) : trainingJob.metadata.namespace}</>;
};

export default TrainingJobProject;
