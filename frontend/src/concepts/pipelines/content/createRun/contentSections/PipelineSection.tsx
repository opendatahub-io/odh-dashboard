import React from 'react';

import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';

type PipelineSectionProps = Pick<React.ComponentProps<typeof RunForm>, 'onValueChange'> & {
  pipeline: PipelineKFv2 | null;
  version: PipelineVersionKFv2 | null;
  updateInputParams: (version: PipelineVersionKFv2 | undefined) => void;
  setInitialLoadedState: (isInitial: boolean) => void;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({
  pipeline,
  version,
  onValueChange,
  updateInputParams,
  setInitialLoadedState,
}) => {
  const onPipelineChange = React.useCallback(
    (value: PipelineKFv2) => {
      onValueChange('pipeline', value);
      onValueChange('version', undefined);
      setInitialLoadedState(false);
    },
    [onValueChange, setInitialLoadedState],
  );

  const onVersionChange = React.useCallback(
    (value: PipelineVersionKFv2) => {
      onValueChange('version', value);
      updateInputParams(value);
    },
    [onValueChange, updateInputParams],
  );

  return (
    <FormSection
      id={CreateRunPageSections.PIPELINE}
      title={runPageSectionTitles[CreateRunPageSections.PIPELINE]}
    >
      <FormGroup label="Pipeline" isRequired>
        <Stack hasGutter>
          <StackItem>
            <PipelineSelector selection={pipeline?.display_name} onSelect={onPipelineChange} />
          </StackItem>
          <StackItem>
            <ImportPipelineButton
              variant="link"
              icon={<PlusCircleIcon />}
              onCreate={onPipelineChange}
            >
              Create new pipeline
            </ImportPipelineButton>
          </StackItem>
        </Stack>
      </FormGroup>

      <FormGroup label="Pipeline version" isRequired>
        <Stack hasGutter>
          <StackItem>
            <PipelineVersionSelector
              selection={version?.display_name}
              pipelineId={pipeline?.pipeline_id}
              onSelect={onVersionChange}
              isCreatePage
            />
          </StackItem>
          <StackItem>
            <ImportPipelineVersionButton
              selectedPipeline={pipeline}
              variant="link"
              icon={<PlusCircleIcon />}
              onCreate={onVersionChange}
            />
          </StackItem>
        </Stack>
      </FormGroup>
    </FormSection>
  );
};

export default PipelineSection;
