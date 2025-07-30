import { FormGroup } from '@patternfly/react-core';
import React from 'react';
import FormSection from '#~/components/pf-overrides/FormSection';
import PipelineKubernetesStoreCheckbox from '#~/concepts/pipelines/content/PipelineKubernetesStoreCheckbox';
import { PipelineServerConfigType } from './types';

type PipelinesAdditionalConfigurationSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const PipelinesDefinitionStorageSection = ({
  setConfig,
  config,
}: PipelinesAdditionalConfigurationSectionProps): React.JSX.Element => (
  <FormSection title="Pipeline definition storage">
    <FormGroup hasNoPaddingTop isStack>
      <FormGroup hasNoPaddingTop isStack>
        <PipelineKubernetesStoreCheckbox
          isChecked={config.storeYamlInKubernetes}
          onChange={(_, enabled) => {
            setConfig({
              ...config,
              storeYamlInKubernetes: enabled,
            });
          }}
        />
      </FormGroup>
    </FormGroup>
  </FormSection>
);

export default PipelinesDefinitionStorageSection;
