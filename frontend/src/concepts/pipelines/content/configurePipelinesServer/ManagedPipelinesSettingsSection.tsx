import React from 'react';
import {
  FormGroup,
  Checkbox,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from './types';

type FormVariantProps = {
  variant?: 'form';
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

type DescriptionVariantProps = {
  variant: 'description';
  enableManagedPipelines: boolean;
  setEnableManagedPipelines: (value: boolean) => void;
};

type ManagedPipelinesSettingsSectionProps = FormVariantProps | DescriptionVariantProps;

const ManagedPipelinesSettingsSection: React.FC<ManagedPipelinesSettingsSectionProps> = (props) => {
  let isChecked: boolean;
  let onChange: () => void;

  if (props.variant === 'description') {
    // Description variant
    isChecked = props.enableManagedPipelines;
    onChange = () => props.setEnableManagedPipelines(!props.enableManagedPipelines);
  } else {
    // Form variant
    isChecked = props.config.enableManagedPipelines;
    onChange = () =>
      props.setConfig({
        ...props.config,
        enableManagedPipelines: !props.config.enableManagedPipelines,
      });
  }

  const checkboxElement = (
    <Checkbox
      id="managed-pipelines-checkbox"
      data-testid="managed-pipelines-checkbox"
      name="managed-pipelines-checkbox"
      label="Enable AutoML and AutoRAG pipelines"
      isChecked={isChecked}
      onChange={onChange}
      description="The AutoML and AutoRAG pipelines contain the steps and instructions for automated model training and RAG pattern experimentation."
    />
  );

  if (props.variant === 'description') {
    return (
      <DescriptionListGroup>
        <DescriptionListTerm>Managed pipelines</DescriptionListTerm>
        <DescriptionListDescription>{checkboxElement}</DescriptionListDescription>
      </DescriptionListGroup>
    );
  }

  return (
    <FormSection
      title="Managed pipelines"
      description="Select managed pipelines to install in your project. Managed pipelines will be created automatically. Restarting the pipeline server will recreate them in the event that they are deleted."
    >
      <FormGroup hasNoPaddingTop isStack>
        {checkboxElement}
      </FormGroup>
    </FormSection>
  );
};

export default ManagedPipelinesSettingsSection;
