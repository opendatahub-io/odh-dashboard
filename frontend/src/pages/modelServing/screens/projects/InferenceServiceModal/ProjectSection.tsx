import * as React from 'react';
import { FormGroup, Text } from '@patternfly/react-core';

type ProjectSectionType = {
  projectName: string;
};

const ProjectSection: React.FC<ProjectSectionType> = ({ projectName }) => (
  <FormGroup label="Project">
    <Text>{projectName}</Text>
  </FormGroup>
);

export default ProjectSection;
