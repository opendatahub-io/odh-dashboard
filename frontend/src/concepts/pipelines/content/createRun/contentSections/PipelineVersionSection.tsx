import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
// import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
// import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';

type PipelineVersionSectionProps = {
  selectedPipeline: PipelineKF | null;
  value: PipelineVersionKF | null;
  onChange: (version: PipelineVersionKF, pipeline?: PipelineKF | null) => void;
};

const PipelineVersionSection: React.FC<PipelineVersionSectionProps> = ({
  selectedPipeline,
  value,
  onChange,
}) => (
  <FormSection
    id={CreateRunPageSections.PIPELINE_VERSION}
    title={runPageSectionTitles[CreateRunPageSections.PIPELINE_VERSION]}
  >
    {/* `minWidth` a temp fix for PF issue https://github.com/patternfly/patternfly/issues/6062
      We can remove this after bumping to PF v5.2.0
    */}
    <FormGroup style={{ minWidth: 0 }}>
      <Stack hasGutter>
        <StackItem>
          <PipelineVersionSelector
            selection={value?.name}
            pipelineId={selectedPipeline?.id}
            onSelect={(version) => {
              onChange(version);
            }}
          />
        </StackItem>
        <StackItem>
          {/* TODO: this file is out of scope for this PR -> bring back during https://issues.redhat.com/browse/RHOAIENG-2224 */}
          {/* <ImportPipelineVersionButton
            selectedPipeline={selectedPipeline}
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipelineVersion, pipeline) => onChange(pipelineVersion, pipeline)}
          /> */}
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default PipelineVersionSection;
