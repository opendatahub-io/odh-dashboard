import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';

type PipelineVersionSectionProps = {
  selectedPipeline: PipelineKFv2 | null;
  value: PipelineVersionKFv2 | null;
  onChange: (version: PipelineVersionKFv2, pipeline?: PipelineKFv2 | null) => void;
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
            selection={value?.display_name}
            pipelineId={selectedPipeline?.pipeline_id}
            onSelect={(version) => {
              onChange(version);
            }}
          />
        </StackItem>
        <StackItem>
          <ImportPipelineVersionButton
            selectedPipeline={selectedPipeline}
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipelineVersion, pipeline) => onChange(pipelineVersion, pipeline)}
          />
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default PipelineVersionSection;
