import * as React from 'react';
import { Form, FormSection } from '@patternfly/react-core';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { RunFormData } from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import RunTypeSection from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSection';
import ParamsSection from '~/concepts/pipelines/content/createRun/contentSections/ParamsSection';
import PipelineSection from './contentSections/PipelineSection';
import { CreateRunPageSections, runPageSectionTitles } from './const';

type RunPageContentProps = {
  data: RunFormData;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
};

const RunForm: React.FC<RunPageContentProps> = ({ data, onValueChange }) => (
  <Form
    maxWidth="500px"
    onSubmit={(e) => {
      e.preventDefault();
    }}
  >
    <FormSection
      id={CreateRunPageSections.PROJECT}
      title={runPageSectionTitles[CreateRunPageSections.PROJECT]}
    >
      <ProjectSelector
        onSelection={(project) => onValueChange('project', project)}
        namespace={data.project.metadata.name}
      />
    </FormSection>
    <FormSection
      id={CreateRunPageSections.NAME_DESC}
      aria-label={runPageSectionTitles[CreateRunPageSections.NAME_DESC]}
    >
      <NameDescriptionField
        nameFieldId="pipeline-name"
        descriptionFieldId="pipeline-description"
        data={data.nameDesc}
        setData={(nameDesc) => onValueChange('nameDesc', nameDesc)}
      />
    </FormSection>
    <PipelineSection
      value={data.pipeline}
      onChange={(pipeline) => {
        onValueChange('pipeline', pipeline);
        onValueChange(
          'params',
          (pipeline.parameters || []).map((p) => ({ label: p.name, value: p.value ?? '' })),
        );
      }}
    />
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
