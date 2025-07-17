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

  const [userClickedCheckbox, setUserClickedCheckbox] = React.useState(false);

  React.useEffect(() => {
    // When caching is disabled (alert appears), scroll to it;
    // but only if it is unchecked because the user just unchecked it
    // (don't auto-scroll in the manage (edit) modal)
    if (userClickedCheckbox && !enableCaching && alertRef.current) {
      alertRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [enableCaching, userClickedCheckbox]);

  // note:  alert is in a div because PatternFly's Alert is a function component that doesn't accept refs directly
  // need the ref for auto-scrolling
  return (
    <FormSection title="Pipeline caching" description="">
      <FormGroup hasNoPaddingTop>
        <Checkbox
          id="pipeline-enable-caching-checkbox"
          data-testid="pipeline-cache-enabling"
          name="enable-caching-checkbox"
          label="Enable caching configuration in pipelines"
          isChecked={enableCaching}
          onChange={() => {
            setEnableCaching(!enableCaching);
            setUserClickedCheckbox(true);
          }}
          body="When enabled, pipelines can be configured to use caching. If unspecified in the pipeline, caching will be enabled by default."
        />
        {!enableCaching && (
          <div ref={alertRef}>
            <Alert
              variant="warning"
              isInline
              title="Caching is disabled"
              style={{ marginTop: '8px' }}
              data-testid="pipeline-caching-disabled-alert"
            >
              All pipelines will be prevented from caching.
            </Alert>
          </div>
        )}
      </FormGroup>
    </FormSection>
  );
};
