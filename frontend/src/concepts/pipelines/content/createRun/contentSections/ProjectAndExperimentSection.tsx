import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem, Content } from '@patternfly/react-core';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { ActiveExperimentSelector } from '~/concepts/pipelines/content/experiment/ExperimentSelector';


type ProjectAndExperimentSectionProps = {
  projectName: string;
  value: ExperimentKF | null;
  onChange: (experiment: ExperimentKF) => void;
};

const ProjectAndExperimentSection: React.FC<ProjectAndExperimentSectionProps> = ({
  projectName,
  value,
  onChange,
}) => (
  <FormSection
    id={CreateRunPageSections.PROJECT_AND_EXPERIMENT}
    title={runPageSectionTitles[CreateRunPageSections.PROJECT_AND_EXPERIMENT]}
  >
    <FormGroup label="Project">
      <Content component="p">{projectName}</Content>
    </FormGroup>
    <FormGroup label="Experiment" aria-label="Experiment" isRequired>
      <Stack hasGutter>
        <StackItem>
          <ActiveExperimentSelector selection={value?.display_name} onSelect={onChange} />
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default ProjectAndExperimentSection;
