import * as React from 'react';
import { HelperText, HelperTextItem, Label, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/concepts/projects/utils';
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

  return (
    <>
      {project ? (
        <>
          {getProjectDisplayName(project)}{' '}
          <Label>
            {project.metadata.labels?.['modelmesh-enabled'] === 'true'
              ? 'Multi-model serving enabled'
              : 'Single-model serving enabled'}
          </Label>
        </>
      ) : (
        'Unknown'
      )}
    </>
  );
};

export default InferenceServiceProject;
