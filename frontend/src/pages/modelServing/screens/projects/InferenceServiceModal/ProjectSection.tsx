import * as React from 'react';
import { FormGroup, Text } from '@patternfly/react-core';
import { translateDisplayNameForK8sAndReport } from '~/concepts/k8s/utils';

type ProjectSectionType = {
  projectName: string;
};

const ProjectSection: React.FC<ProjectSectionType> = ({ projectName }) => {
  const [translatedName] = translateDisplayNameForK8sAndReport(projectName);

  return (
    <FormGroup label="Project">
      <Text>{translatedName}</Text>
    </FormGroup>
  );
};

export default ProjectSection;
