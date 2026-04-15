import * as React from 'react';
import { FormGroup, FormSection, Content } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';

type ProjectSectionProps = {
  projectName: string;
};

const ProjectSection: React.FC<ProjectSectionProps> = ({ projectName }) => (
  <FormSection
    id={CreateRunPageSections.PROJECT}
    title={runPageSectionTitles[CreateRunPageSections.PROJECT]}
  >
    <FormGroup label="Project">
      <Content component="p">{projectName}</Content>
    </FormGroup>
  </FormSection>
);

export default ProjectSection;
