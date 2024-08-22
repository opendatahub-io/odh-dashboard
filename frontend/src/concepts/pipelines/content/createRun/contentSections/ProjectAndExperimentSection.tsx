import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem, Text } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { ActiveExperimentSelector } from '~/concepts/pipelines/content/experiment/ExperimentSelector';
import CreateExperimentButton from '~/concepts/pipelines/content/experiment/CreateExperimentButton';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type ProjectAndExperimentSectionProps = {
  projectName: string;
  value: ExperimentKFv2 | null;
  onChange: (experiment: ExperimentKFv2) => void;
};

const ProjectAndExperimentSection: React.FC<ProjectAndExperimentSectionProps> = ({
  projectName,
  value,
  onChange,
}) => {
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  return (
    <FormSection
      id={CreateRunPageSections.PROJECT_AND_EXPERIMENT}
      title={
        isExperimentsAvailable
          ? runPageSectionTitles[CreateRunPageSections.PROJECT_AND_EXPERIMENT]
          : 'Project'
      }
    >
      <FormGroup label="Project">
        <Text>{projectName}</Text>
      </FormGroup>
      {isExperimentsAvailable && (
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
      )}
    </FormSection>
  );
};

export default ProjectAndExperimentSection;
