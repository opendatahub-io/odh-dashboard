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
}: PipelineCachingSectionProps): React.JSX.Element => {
  const alertRef = React.useRef<HTMLDivElement>(null);

  // needed to make sure the alert is shown; else it will
  // be hidden below the 'scroll fold'
  React.useEffect(() => {
    // When caching is disabled (alert appears), scroll to it
    if (!config.enableCaching && alertRef.current) {
      alertRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [config.enableCaching]);

  // note:  alert is in a div because PatternFly's Alert is a function component that doesn't accept refs directly
  // need the ref for auto-scrolling
  return (
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
          <div ref={alertRef}>
            <Alert
              variant="warning"
              isInline
              title="Caching is disabled"
              style={{ marginTop: '8px' }}
            >
              All pipelines will be prevented from caching.
            </Alert>
          </div>
        )}
      </FormGroup>
    </FormSection>
  );
};
