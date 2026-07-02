import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { ThemeAwareFormGroupWrapper } from 'mod-arch-shared';

type PrefilledModelRegistryFieldProps = {
  mrName?: string;
};

const PrefilledModelRegistryField: React.FC<PrefilledModelRegistryFieldProps> = ({ mrName }) => {
  const mrNameInput = (
    <TextInput isDisabled isRequired type="text" id="mr-name" name="mr-name" value={mrName} />
  );

  return (
    <ThemeAwareFormGroupWrapper
      className="form-group-disabled"
      label="Model registry"
      fieldId="mr-name"
      isRequired
    >
      {mrNameInput}
    </ThemeAwareFormGroupWrapper>
  );
};

export default PrefilledModelRegistryField;
