import React from 'react';
import FormSection from '~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from '~/concepts/pipelines/content/configurePipelinesServer/types';
import InstructLabPipelineEnablement from '~/concepts/pipelines/content/configurePipelinesServer/InstructLabPipelineEnablement';

type SamplePipelineSettingsSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const SamplePipelineSettingsSection: React.FC<SamplePipelineSettingsSectionProps> = ({
  config,
  setConfig,
}) => (
  <FormSection
    title="Enable sample pipelines"
    description="Enabled pipelines will be accessible and automatically updated within your pipeline server."
  >
    {/* TODO: add description for the instruct lab pipeline */}
    <InstructLabPipelineEnablement
      isEnabled={config.enableInstructLab}
      setEnabled={(enabled) => {
        setConfig({ ...config, enableInstructLab: enabled });
      }}
    />
  </FormSection>
);

export default SamplePipelineSettingsSection;
