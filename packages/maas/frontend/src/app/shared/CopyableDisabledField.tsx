import React from 'react';
import {
  FormGroup,
  ClipboardCopy,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';

type CopyableDisabledFieldProps = {
  id: string;
  label: string;
  value: string;
  helperText?: React.ReactNode;
};

const CopyableDisabledField: React.FC<CopyableDisabledFieldProps> = ({
  id,
  label,
  value,
  helperText,
}) => (
  <FormGroup label={label} fieldId={id}>
    <ClipboardCopy
      inputId={id}
      textAriaLabel={label}
      isReadOnly
      hoverTip="Copy"
      clickTip="Copied"
      className="pf-v6-u-w-100"
      dir="ltr"
    >
      {value}
    </ClipboardCopy>
    {helperText ? (
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{helperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    ) : null}
  </FormGroup>
);

export default CopyableDisabledField;
