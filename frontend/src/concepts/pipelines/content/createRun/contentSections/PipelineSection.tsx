import * as React from 'react';
import { FormSection } from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import { pipelineSelectorColumns } from '~/concepts/pipelines/content/pipelineSelector/columns';

type PipelineSectionProps = {
  onLoaded: (loaded: boolean) => void;
  value: PipelineKF | null;
  onChange: (pipeline: PipelineKF) => void;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({ onLoaded, value, onChange }) => {
  const [{ items: pipelines }, loaded] = usePipelines({}, 0);

  React.useEffect(() => {
    onLoaded(loaded);
    // only run when `loaded` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <FormSection
      id={CreateRunPageSections.PIPELINE}
      title={runPageSectionTitles[CreateRunPageSections.PIPELINE]}
    >
      <PipelineSelector
        name={value?.name}
        data={pipelines}
        columns={pipelineSelectorColumns}
        onSelect={(id) => {
          const pipeline = pipelines.find((p) => p.id === id);
          if (pipeline) {
            onChange(pipeline);
          }
        }}
        isLoading={!loaded}
        placeHolder={pipelines.length === 0 ? 'No pipelines available' : 'Select a pipeline'}
        searchHelperText={`Type a name to search your ${pipelines.length} pipelines.`}
      />
    </FormSection>
  );
};

export default PipelineSection;
