import * as React from 'react';
import { FormGroup, Content } from '@patternfly/react-core';

type ProjectSectionType = {
  projectName: string;
};

const ProjectSection: React.FC<ProjectSectionType> = ({ projectName }) => (
  <FormGroup label="Project">
    <Content component="p">{projectName}</Content>
  </FormGroup>
);

export default ProjectSection;
