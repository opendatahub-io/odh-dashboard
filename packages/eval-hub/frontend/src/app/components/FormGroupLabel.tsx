import * as React from 'react';
import { Content, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import './FormGroupLabel.scss';

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
// The trigger uses a <span role="button"> instead of <Button> to avoid nesting a
// labelable element inside the FormGroup's native <label>.
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
        <Popover aria-label={helpPopover.ariaLabel} bodyContent={helpPopover.content}>
          <span
            role="button"
            tabIndex={0}
            aria-label={helpPopover.ariaLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            className="evalhub-form-group-label__help-trigger"
          >
            <OutlinedQuestionCircleIcon />
          </span>
        </Popover>
      </>
    )}
    <Content component="small">{description}</Content>
  </>
);

export default FormGroupLabel;
