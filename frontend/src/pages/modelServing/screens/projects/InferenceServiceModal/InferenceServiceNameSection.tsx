import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type InferenceServiceNameSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const InferenceServiceNameSection: React.FC<InferenceServiceNameSectionProps> = ({
  data,
  setData,
}) => (
  <FormGroup label="Model name" fieldId="inference-service-name-input" isRequired>
    <TextInput
      isRequired
      id="inference-service-name-input"
      value={data.name}
      onChange={(name) => setData('name', name)}
    />
  </FormGroup>
);

export default InferenceServiceNameSection;
