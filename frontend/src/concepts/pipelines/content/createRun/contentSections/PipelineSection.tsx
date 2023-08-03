import * as React from 'react';
import { FormSection, Skeleton, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

type PipelineSectionProps = {
  onLoaded: (loaded: boolean) => void;
  value: PipelineKF | null;
  onChange: (pipeline: PipelineKF) => void;
};

const PipelineSection: React.FC<PipelineSectionProps> = ({ onLoaded, value, onChange }) => {
  const [pipelines, loaded] = usePipelines();
  React.useEffect(() => {
    onLoaded(loaded);
    // only run when `loaded` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  if (!loaded) {
    return <Skeleton />;
  }
  return (
    <FormSection
      id={CreateRunPageSections.PIPELINE}
      title={runPageSectionTitles[CreateRunPageSections.PIPELINE]}
    >
      <Stack hasGutter>
        <StackItem>
          <SimpleDropdownSelect
            placeholder="Select a pipeline"
            options={pipelines.map((p) => ({ key: p.id, label: p.name }))}
            value={value?.id ?? ''}
            onChange={(id) => {
              const pipeline = pipelines.find((p) => p.id === id);
              if (pipeline) {
                onChange(pipeline);
              }
            }}
          />
        </StackItem>
        <StackItem>
          <ImportPipelineButton
            variant="link"
            icon={<PlusCircleIcon />}
            onCreate={(pipeline) => onChange(pipeline)}
          >
            Import pipeline
          </ImportPipelineButton>
        </StackItem>
      </Stack>
    </FormSection>
  );
};

export default PipelineSection;
