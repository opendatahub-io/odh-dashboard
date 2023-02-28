import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';

type InferenceServiceProjectProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceProject: React.FC<InferenceServiceProjectProps> = ({ inferenceService }) => {
  const {
    projects: { data: projects, loaded, error },
  } = React.useContext(ModelServingContext);
  const project = projects.find(
    ({ metadata: { name } }) => name === inferenceService.metadata.namespace,
  );

  if (!loaded) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <HelperText>
        <HelperTextItem variant="warning" hasIcon>
          Failed to get project for this deployed model. {error.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  return <>{project ? getProjectDisplayName(project) : 'Unknown'}</>;
};

export default InferenceServiceProject;
