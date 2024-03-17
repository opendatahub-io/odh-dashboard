import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import ExperimentSelector from '~/concepts/pipelines/content/experiment/ExperimentSelector';
import CreateExperimentButton from '~/concepts/pipelines/content/experiment/CreateExperimentButton';

type ExperimentSectionProps = {
  value: ExperimentKFv2 | null;
  onChange: (experiment: ExperimentKFv2) => void;
};

const ExperimentSection: React.FC<ExperimentSectionProps> = ({ value, onChange }) => (
  <FormSection
    id={CreateRunPageSections.EXPERIMENT}
    title={runPageSectionTitles[CreateRunPageSections.EXPERIMENT]}
  >
    <FormGroup>
      <Stack hasGutter>
        <StackItem>
          <ExperimentSelector selection={value?.display_name} onSelect={onChange} />
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

export default ExperimentSection;
