import React from 'react';
import {
  FormGroup,
  Checkbox,
  Alert,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';

type PipelineCachingSectionProps = {
  enableCaching: boolean;
  setEnableCaching: (value: boolean) => void;
  variant?: 'form' | 'description';
};

export const PipelineCachingSection = ({
  enableCaching,
  setEnableCaching,
  variant = 'form',
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

  const checkboxElement = (
    <Checkbox
      id="pipeline-enable-caching-checkbox"
      data-testid="pipeline-cache-enabling"
      name="enable-caching-checkbox"
      label="Allow caching to be configured per pipeline and task"
      isChecked={enableCaching}
      onChange={() => {
        setEnableCaching(!enableCaching);
        setUserClickedCheckbox(true);
      }}
      description="When enabled, pipelines and tasks can configure caching. By default, caching is on unless changed. This setting can only be changed later in DSPA."
    />
  );

  // note:  alert is in a div because the :
  // 1) alerts don't take refs
  // 2) the StackItem is not properly passing down the ref (the auto-scrolling is not happening when the ref is on the stackItem)
  //   using the Stackitem for the margins; as opposed to adding a margin directly with explicit css.
  // need the ref for auto-scrolling (scroll to the alert upon unchecking the box; else the alert is below the fold and invisible to the user)
  const alertElement = !enableCaching && (
    <div ref={alertRef}>
      <StackItem>
        <Alert
          variant="warning"
          isInline
          title="Caching is disabled"
          data-testid="pipeline-caching-disabled-alert"
        >
          All pipelines will be prevented from caching.
        </Alert>
      </StackItem>
    </div>
  );

  const getMainComponent = () => {
    if (variant === 'description') {
      return (
        <DescriptionListGroup>
          <DescriptionListTerm>Pipeline caching</DescriptionListTerm>
          <DescriptionListDescription>{checkboxElement}</DescriptionListDescription>
        </DescriptionListGroup>
      );
    }

    return (
      <FormSection title="Pipeline caching" description="">
        <FormGroup hasNoPaddingTop isStack>
          <FormGroup hasNoPaddingTop isStack>
            {checkboxElement}
          </FormGroup>
        </FormGroup>
      </FormSection>
    );
  };

  return (
    <Stack hasGutter>
      {getMainComponent()} {alertElement}
    </Stack>
  );
};
