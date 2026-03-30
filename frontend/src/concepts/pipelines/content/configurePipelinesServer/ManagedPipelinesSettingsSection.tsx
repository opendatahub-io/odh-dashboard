import React from 'react';
import { FormGroup, Checkbox } from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from './types';

type ManagedPipelinesSettingsSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const ManagedPipelinesSettingsSection: React.FC<ManagedPipelinesSettingsSectionProps> = ({
  config,
  setConfig,
}) => (
  <FormSection
    title="Managed pipelines"
    description="Select managed pipelines to install on your project and enable automatic updates."
  >
    <FormGroup hasNoPaddingTop isStack>
      <Checkbox
        id="managed-pipelines-checkbox"
        data-testid="managed-pipelines-checkbox"
        name="managed-pipelines-checkbox"
        label="AutoML and AutoRAG pipelines"
        isChecked={config.enableManagedPipelines}
        onChange={() => {
          setConfig({ ...config, enableManagedPipelines: !config.enableManagedPipelines });
        }}
        description="The AutoML and AutoRAG pipelines contain the steps and instructions for automated model training and RAG pattern experimentation."
      />
    </FormGroup>
  </FormSection>
);

export default ManagedPipelinesSettingsSection;
