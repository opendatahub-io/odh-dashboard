import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type NIMModelDeploymentNameSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const NIMModelDeploymentNameSection: React.FC<NIMModelDeploymentNameSectionProps> = ({
  data,
  setData,
}) => (
  <FormGroup label="Model deployment name" fieldId="model-deployment-name-section" isRequired>
    <TextInput
      isRequired
      id="model-deployment-name-section"
      data-testid="model-deployment-name-section"
      value={data.name}
      onChange={(e, name) => setData('name', name)}
    />
  </FormGroup>
);

export default NIMModelDeploymentNameSection;
