import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem, Content } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';
import { ActiveExperimentSelector } from '#~/concepts/pipelines/content/experiment/ExperimentSelector';
import CreateExperimentButton from '#~/concepts/pipelines/content/experiment/CreateExperimentButton';

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
        <StackItem>
          <CreateExperimentButton
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(experiment) => onChange(experiment)}
          >
            Create new experiment
          </CreateExperimentButton>
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default ProjectAndExperimentSection;
