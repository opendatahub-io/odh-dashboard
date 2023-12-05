import * as React from 'react';
import { FormSection } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import usePipelineVersionsForPipeline from '~/concepts/pipelines/apiHooks/usePipelineVersionsForPipeline';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import { pipelineVersionSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';

type PipelineVersionSectionProps = {
  onLoaded: (loaded: boolean) => void;
  pipelineId?: string;
  value: PipelineVersionKF | null;
  onChange: (version: PipelineVersionKF) => void;
};

const PipelineVersionSection: React.FC<PipelineVersionSectionProps> = ({
  onLoaded,
  pipelineId,
  value,
  onChange,
}) => {
  const [{ items: versions }, loaded] = usePipelineVersionsForPipeline(pipelineId, {}, 0);

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
      <PipelineSelector
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
    </FormSection>
  );
};

export default PipelineVersionSection;
