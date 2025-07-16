import React from 'react';
import { FormGroup, Checkbox, Alert } from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';
import { PipelineServerConfigType } from './types';

type PipelineCachingSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

export const PipelineCachingSection = ({
  setConfig,
  config,
}: PipelineCachingSectionProps): React.JSX.Element => (
  <FormSection title="Pipeline caching" description="">
    <FormGroup hasNoPaddingTop>
      <Checkbox
        id="pipeline-enable-caching-checkbox"
        data-testid="pipeline-init-enable-caching-checkbox"
        name="enable-caching-checkbox"
        label="Enable caching configuration in pipelines"
        isChecked={config.enableCaching}
        onChange={() =>
          setConfig({
            ...config,
            enableCaching: !config.enableCaching,
          })
        }
        body="When enabled, pipelines can be configured to use caching. If unspecified in the pipeline, caching will be enabled by default."
      />
      {!config.enableCaching && (
        <Alert variant="warning" isInline title="Caching is disabled" style={{ marginTop: '8px' }}>
          All pipelines will be prevented from caching.
        </Alert>
      )}
    </FormGroup>
  </FormSection>
);
