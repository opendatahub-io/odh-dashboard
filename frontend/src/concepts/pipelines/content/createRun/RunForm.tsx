import * as React from 'react';
import { Form, FormGroup, FormSection, Text } from '@patternfly/react-core';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { RunFormData } from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import RunTypeSection from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSection';
import ParamsSection from '~/concepts/pipelines/content/createRun/contentSections/ParamsSection';
import { getProjectDisplayName } from '~/pages/projects/utils';
// import PipelineVersionSection from '~/concepts/pipelines/content/createRun/contentSections/PipelineVersionSection';
// import PipelineSection from './contentSections/PipelineSection';
import { CreateRunPageSections, runPageSectionTitles } from './const';

type RunFormProps = {
  data: RunFormData;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
};

const RunForm: React.FC<RunFormProps> = ({ data, onValueChange }) => (
  <Form
    maxWidth="500px"
    onSubmit={(e) => {
      e.preventDefault();
    }}
  >
    <FormSection id="run-section-project-name" title="Project">
      <FormGroup label="Project">
        <Text>{getProjectDisplayName(data.project)}</Text>
      </FormGroup>
    </FormSection>
    <FormSection
      id={CreateRunPageSections.NAME_DESC}
      aria-label={runPageSectionTitles[CreateRunPageSections.NAME_DESC]}
    >
      <NameDescriptionField
        nameFieldId="run-name"
        descriptionFieldId="run-description"
        data={data.nameDesc}
        setData={(nameDesc) => onValueChange('nameDesc', nameDesc)}
      />
    </FormSection>
    {/* TODO: removed bc out of scope for this PR. bring back during https://issues.redhat.com/browse/RHOAIENG-2295 */}
    {/* <PipelineSection
      value={data.pipeline}
      onChange={(pipeline) => {
        onValueChange('pipeline', pipeline);
        onValueChange('version', pipeline.default_version);
        onValueChange(
          'params',
          (pipeline.default_version?.parameters || pipeline.parameters || []).map((p) => ({
            label: p.name,
            value: p.value ?? '',
          })),
        );
      }}
    />
    <PipelineVersionSection
      selectedPipeline={data.pipeline}
      value={data.version}
      onChange={(version, pipeline) => {
        if (pipeline) {
          onValueChange('pipeline', pipeline);
        }
        onValueChange('version', version);
        onValueChange(
          'params',
          (version.parameters || []).map((p) => ({
            label: p.name,
            value: p.value ?? '',
          })),
        );
      }}
    /> */}
    {/*
    <ExperimentSection
      value={data.experiment}
      onChange={(experiment) => onValueChange('experiment', experiment)}
    />
    */}
    <RunTypeSection
      value={data.runType}
      onChange={(runType) => onValueChange('runType', runType)}
    />
    <ParamsSection value={data.params} onChange={(params) => onValueChange('params', params)} />
  </Form>
);

export default RunForm;
