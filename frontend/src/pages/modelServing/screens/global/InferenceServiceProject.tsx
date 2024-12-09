import * as React from 'react';
import { HelperText, HelperTextItem, Label, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type InferenceServiceProjectProps = {
  inferenceService: InferenceServiceKind;
  isCompact?: boolean;
};

const InferenceServiceProject: React.FC<InferenceServiceProjectProps> = ({
  inferenceService,
  isCompact,
}) => {
  const { modelServingProjects, loaded, loadError } = React.useContext(ProjectsContext);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">
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
          {getDisplayNameFromK8sResource(project)}{' '}
          <Label isCompact={isCompact}>
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
