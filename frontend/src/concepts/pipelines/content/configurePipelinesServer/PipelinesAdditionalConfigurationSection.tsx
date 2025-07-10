import { Checkbox, ExpandableSection, FormGroup } from '@patternfly/react-core';
import React from 'react';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from './types';

type PipelinesAdditionalConfigurationSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

const PipelinesAdditionalConfigurationSection = ({
  setConfig,
  config,
}: PipelinesAdditionalConfigurationSectionProps): React.JSX.Element => {
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
              id="pipeline-configure-server-kubernetes-store-checkbox"
              label="Store pipeline yaml files in Kubernetes"
              isChecked={config.storeYamlInKubernetes}
              onChange={(e, enabled) => {
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
