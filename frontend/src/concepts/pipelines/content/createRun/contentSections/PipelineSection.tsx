import React from 'react';

import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';

type PipelineSectionProps = Pick<React.ComponentProps<typeof RunForm>, 'onValueChange'> & {
  pipeline: PipelineKF | null;
  version: PipelineVersionKF | null;
  updateInputParams: (version: PipelineVersionKF | undefined) => void;
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
    (value: PipelineKF) => {
      onValueChange('pipeline', value);
      onValueChange('version', undefined);
      setInitialLoadedState(false);
    },
    [onValueChange, setInitialLoadedState],
  );

  const onVersionChange = React.useCallback(
    (value: PipelineVersionKF) => {
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
              redirectAfterImport={false}
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
