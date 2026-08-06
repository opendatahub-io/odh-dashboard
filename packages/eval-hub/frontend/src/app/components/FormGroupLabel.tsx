import * as React from 'react';
import { Button, Content, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type FormGroupLabelProps = {
  label: React.ReactNode;
  description: React.ReactNode;
  isRequired?: boolean;
  helpPopover?: {
    ariaLabel: string;
    content: React.ReactNode;
  };
};

// FormGroup's `isRequired` and `labelHelp` props render after the entire `label`
// content, so when a block-level description is part of the label, the asterisk and
// help icon drop below the description. This component places them inline before the
// description, bypassing those FormGroup props.
const FormGroupLabel: React.FC<FormGroupLabelProps> = ({
  label,
  description,
  isRequired,
  helpPopover,
}) => (
  <>
    {label}
    {isRequired && (
      <span className="pf-v6-c-form__label-required" aria-hidden="true">
        &nbsp;*
      </span>
    )}
    {helpPopover && (
      <>
        {' '}
        <Popover bodyContent={helpPopover.content}>
          <Button
            variant="plain"
            isInline
            aria-label={helpPopover.ariaLabel}
            style={{ padding: 0, display: 'inline-flex', verticalAlign: 'middle' }}
          >
            <OutlinedQuestionCircleIcon />
          </Button>
        </Popover>
      </>
    )}
    <Content component="small">{description}</Content>
  </>
);

export default FormGroupLabel;
