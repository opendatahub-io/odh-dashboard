import * as React from 'react';
import { FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import { pipelineVersionSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';
import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';

type PipelineVersionSectionProps = {
  onLoaded: (loaded: boolean) => void;
  pipeline: PipelineKF | null;
  value: PipelineVersionKF | null;
  onChange: (version: PipelineVersionKF) => void;
};

const PipelineVersionSection: React.FC<PipelineVersionSectionProps> = ({
  onLoaded,
  pipeline,
  value,
  onChange,
}) => {
  const pipelineId = pipeline?.id;
  const [{ items: versions }, loaded] = usePipelineVersionsForPipeline(pipelineId);

  React.useEffect(() => {
    onLoaded(loaded);
    // only run when `loaded` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <FormSection
      id={CreateRunPageSections.PIPELINE_VERSION}
      title={runPageSectionTitles[CreateRunPageSections.PIPELINE_VERSION]}
    >
      <Stack hasGutter>
        <StackItem>
          <PipelineSelector
            maxWidth="500px"
            name={value?.name}
            data={versions}
            columns={pipelineVersionSelectorColumns}
            onSelect={(id) => {
              const version = versions.find((v) => v.id === id);
              if (version) {
                onChange(version);
              }
            }}
            isDisabled={!pipelineId}
            isLoading={!!pipelineId && !loaded}
            placeHolder={
              pipelineId && versions.length === 0
                ? 'No versions available'
                : 'Select a pipeline version'
            }
            searchHelperText={`Type a name to search your ${versions.length} versions.`}
          />
        </StackItem>
        <StackItem>
          <ImportPipelineVersionButton
            pipeline={pipeline}
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipelineVersion) => onChange(pipelineVersion)}
          />
        </StackItem>
      </Stack>
    </FormSection>
  );
};

export default PipelineVersionSection;
