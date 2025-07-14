import React from 'react';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from '#~/concepts/pipelines/content/configurePipelinesServer/types';
import InstructLabPipelineEnablement from '#~/concepts/pipelines/content/configurePipelinesServer/InstructLabPipelineEnablement';

type SamplePipelineSettingsSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const SamplePipelineSettingsSection: React.FC<SamplePipelineSettingsSectionProps> = ({
  config,
  setConfig,
}) => (
  <FormSection
    title="Install preconfigured pipelines"
    description={
      <>
        The selected preconfigured pipelines will be installed on your project, and updates will be
        applied to them automatically. To turn off automatic updates, click{' '}
        <b>Manage preconfigured pipelines</b> in the action dropdown on the <b>Pipelines</b> page.
      </>
    }
  >
    <InstructLabPipelineEnablement
      isEnabled={config.enableInstructLab}
      setEnabled={(enabled) => {
        setConfig({ ...config, enableInstructLab: enabled });
      }}
    />
  </FormSection>
);

export default SamplePipelineSettingsSection;
