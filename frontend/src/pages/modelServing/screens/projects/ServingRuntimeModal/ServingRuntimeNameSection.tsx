import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';

type ServingRuntimeNameSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

const ServingRuntimeNameSection: React.FC<ServingRuntimeNameSectionProps> = ({ data, setData }) => (
  <FormGroup label="Model server name" fieldId="serving-runtime-name-input" isRequired>
    <TextInput
      isRequired
      id="serving-runtime-name-input"
      data-testid="serving-runtime-name-input"
      value={data.name}
      onChange={(e, name) => setData('name', name)}
    />
  </FormGroup>
);

export default ServingRuntimeNameSection;
