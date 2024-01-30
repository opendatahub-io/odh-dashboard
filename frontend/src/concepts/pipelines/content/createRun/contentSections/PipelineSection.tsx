import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
// import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
// import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

type PipelineSectionProps = {
  value: PipelineKF | null;
  onChange: (pipeline: PipelineKF) => void;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({ value, onChange }) => (
  <FormSection
    id={CreateRunPageSections.PIPELINE}
    title={runPageSectionTitles[CreateRunPageSections.PIPELINE]}
  >
    {/* `minWidth` a temp fix for PF issue https://github.com/patternfly/patternfly/issues/6062
      We can remove this after bumping to PF v5.2.0
    */}
    <FormGroup style={{ minWidth: 0 }}>
      <Stack hasGutter>
        <StackItem>
          <PipelineSelector selection={value?.name} onSelect={(pipeline) => onChange(pipeline)} />
        </StackItem>
        <StackItem>
          {/* TODO: this file is out of scope for this PR -> bring back during https://issues.redhat.com/browse/RHOAIENG-2224 */}
          {/* <ImportPipelineButton
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipeline) => onChange(pipeline)}
          >
            Create new pipeline
          </ImportPipelineButton> */}
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default PipelineSection;
