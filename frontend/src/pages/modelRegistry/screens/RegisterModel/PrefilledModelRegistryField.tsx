import React from 'react';
import { FormGroup } from '@patternfly/react-core';

type PrefilledModelRegistryFieldProps = {
  mrName?: string;
};

const PrefilledModelRegistryField: React.FC<PrefilledModelRegistryFieldProps> = ({ mrName }) => (
  <FormGroup label="Model registry" fieldId="mr-name">
    {mrName}
  </FormGroup>
);

export default PrefilledModelRegistryField;
