import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { getProjectDisplayName } from '../../../projects/utils';
import useConnectedProject from './useConnectedProject';

type InferenceServiceProjectProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceProject: React.FC<InferenceServiceProjectProps> = ({ inferenceService }) => {
  const [project, loaded, loadError] = useConnectedProject(inferenceService.metadata.namespace);

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

  return <>{project ? getProjectDisplayName(project) : 'Unknown'}</>;
};

export default InferenceServiceProject;
