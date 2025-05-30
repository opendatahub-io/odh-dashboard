import React from 'react';

import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import PipelineSelector from '#~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import ImportPipelineButton from '#~/concepts/pipelines/content/import/ImportPipelineButton';
import PipelineVersionSelector from '#~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import RunForm from '#~/concepts/pipelines/content/createRun/RunForm';
import { PipelineVersionToUse } from '#~/concepts/pipelines/content/createRun/types';
import PipelineVersionRadioGroup from '#~/concepts/pipelines/content/createRun/contentSections/PipelineVersionRadioGroup';
import ImportPipelineVersionButton from '#~/concepts/pipelines/content/import/ImportPipelineVersionButton';

type PipelineSectionProps = Pick<React.ComponentProps<typeof RunForm>, 'onValueChange'> & {
  pipeline: PipelineKF | null;
  selectedVersion: PipelineVersionKF | null;
  latestVersion: PipelineVersionKF | null;
  latestVersionLoaded: boolean;
  versionToUse: PipelineVersionToUse;
  updateInputParams: (version: PipelineVersionKF | undefined) => void;
  setInitialLoadedState: (isInitial: boolean) => void;
  isSchedule: boolean;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({
  pipeline,
  selectedVersion,
  latestVersion,
  latestVersionLoaded,
  versionToUse,
  onValueChange,
  updateInputParams,
  setInitialLoadedState,
  isSchedule,
}) => {
  const onPipelineChange = React.useCallback(
    (value: PipelineKF) => {
      onValueChange('pipeline', value);
      onValueChange('version', undefined);
      onValueChange('versionToUse', PipelineVersionToUse.LATEST);
      setInitialLoadedState(false);
    },
    [onValueChange, setInitialLoadedState],
  );

  const onVersionChange = React.useCallback(
    (args: { value: PipelineVersionKF; versionToUse: PipelineVersionToUse }) => {
      onValueChange('version', args.value);
      onValueChange('versionToUse', args.versionToUse);
      updateInputParams(args.value);
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
        {isSchedule ? (
          <PipelineVersionRadioGroup
            pipeline={pipeline}
            selectedVersion={selectedVersion}
            latestVersion={latestVersion}
            latestVersionLoaded={latestVersionLoaded}
            versionToUse={versionToUse}
            onVersionChange={onVersionChange}
          />
        ) : (
          <Stack hasGutter>
            <StackItem>
              <PipelineVersionSelector
                selection={selectedVersion?.display_name}
                pipelineId={pipeline?.pipeline_id}
                onSelect={(value) => {
                  onVersionChange({ value, versionToUse: PipelineVersionToUse.PROVIDED });
                }}
                isCreatePage
              />
            </StackItem>
            <StackItem>
              <ImportPipelineVersionButton
                data-testid="import-pipeline-version-button"
                selectedPipeline={pipeline}
                variant="link"
                icon={<PlusCircleIcon />}
                onCreate={(value) => {
                  onVersionChange({ value, versionToUse: PipelineVersionToUse.PROVIDED });
                }}
                redirectAfterImport={false}
              />
            </StackItem>
          </Stack>
        )}
      </FormGroup>
    </FormSection>
  );
};

export default PipelineSection;
