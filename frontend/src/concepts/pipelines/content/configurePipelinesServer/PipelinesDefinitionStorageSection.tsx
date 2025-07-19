import { Checkbox, FormGroup } from '@patternfly/react-core';
import React from 'react';
import FormSection from '#~/components/pf-overrides/FormSection';
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
        <Checkbox
          id="pipeline-kubernetes-store-checkbox"
          data-testid="pipeline-kubernetes-store-checkbox"
          label="Store pipeline definitions in Kubernetes"
          description="Store your pipeline definitions as Kubernetes custom resources. This enables GitOps, letting you manage, version, and deploy your ML pipelines with tools like OpenShift GitOps for consistent, traceable workflows."
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
