import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';

type InferenceServiceProjectProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceProject: React.FC<InferenceServiceProjectProps> = ({ inferenceService }) => {
  const { modelServingProjects, loaded, loadError } = React.useContext(ProjectsContext);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning" hasIcon>
          Failed to get project for this deployed model. {loadError.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  const project = modelServingProjects.find(byName(inferenceService.metadata.namespace));

  return <>{project ? getProjectDisplayName(project) : 'Unknown'}</>;
};

export default InferenceServiceProject;
