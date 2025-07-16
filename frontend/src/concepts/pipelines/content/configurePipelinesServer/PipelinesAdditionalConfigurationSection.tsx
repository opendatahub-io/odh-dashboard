import { Checkbox, ExpandableSection, FormGroup } from '@patternfly/react-core';
import React from 'react';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from './types';

type PipelinesAdditionalConfigurationProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const PipelinesAdditionalConfigurationSection = ({
  setConfig,
  config,
}: PipelinesAdditionalConfigurationProps): React.JSX.Element => {
  const [configurationIsExpanded, setConfigurationIsExpanded] = React.useState(false);

  return (
    <FormSection
      title="Additional Configuration"
      description="Additional settings for your pipeline server."
    >
      <FormGroup hasNoPaddingTop isStack>
        <ExpandableSection
          isIndented
          toggleText={`${configurationIsExpanded ? 'Hide' : 'Show'} more configuration options.`}
          onToggle={() => setConfigurationIsExpanded(!configurationIsExpanded)}
          isExpanded={configurationIsExpanded}
        >
          <FormGroup hasNoPaddingTop isStack>
            <Checkbox
              id="pipeline-kubernetes-store-checkbox"
              data-testid="pipeline-kubernetes-store-checkbox"
              label="Store pipeline yaml files in Kubernetes"
              description="Store your pipeline definitions as Kubernetes custom resources. This enables GitOps, letting you manage, version, and deploy your ML pipelines with tools like OpenShift GitOps for consistent, traceable workflows. This cannot be changed after pipeline server configuration."
              isChecked={config.storeYamlInKubernetes}
              onChange={(_, enabled) => {
                setConfig({
                  ...config,
                  storeYamlInKubernetes: enabled,
                });
              }}
            />
          </FormGroup>
        </ExpandableSection>
      </FormGroup>
    </FormSection>
  );
};

export default PipelinesAdditionalConfigurationSection;
