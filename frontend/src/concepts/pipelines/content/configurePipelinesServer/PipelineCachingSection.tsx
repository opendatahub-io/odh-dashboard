import React from 'react';
import { FormGroup, Checkbox, Alert } from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';

type PipelineCachingSectionProps = {
  enableCaching: boolean;
  setEnableCaching: (value: boolean) => void;
};

export const PipelineCachingSection = ({
  enableCaching,
  setEnableCaching,
}: PipelineCachingSectionProps): React.JSX.Element => {
  const alertRef = React.useRef<HTMLDivElement>(null);

  console.log('arghh 477a: enableC?', enableCaching);
  React.useEffect(() => {
    // When caching is disabled (alert appears), scroll to it
    if (!enableCaching && alertRef.current) {
      alertRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [enableCaching]);

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
          isChecked={enableCaching}
          onChange={() => setEnableCaching(!enableCaching)}
          body="When enabled, pipelines can be configured to use caching. If unspecified in the pipeline, caching will be enabled by default."
        />
        {!enableCaching && (
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
