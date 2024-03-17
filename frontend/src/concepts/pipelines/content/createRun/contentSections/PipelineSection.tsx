import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

type PipelineSectionProps = {
  value: PipelineKFv2 | null;
  onChange: (pipeline: PipelineKFv2) => void;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({ value, onChange }) => (
  <FormSection
    id={CreateRunPageSections.PIPELINE}
    title={runPageSectionTitles[CreateRunPageSections.PIPELINE]}
  >
    <FormGroup>
      <Stack hasGutter>
        <StackItem>
          <PipelineSelector
            selection={value?.display_name}
            onSelect={(pipeline) => onChange(pipeline)}
          />
        </StackItem>
        <StackItem>
          <ImportPipelineButton
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipeline) => onChange(pipeline)}
          >
            Create new pipeline
          </ImportPipelineButton>
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default PipelineSection;
