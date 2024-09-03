import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type InferenceServiceNameSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  isNameValid: boolean;
};

const InferenceServiceNameSection: React.FC<InferenceServiceNameSectionProps> = ({
  data,
  setData,
  isNameValid,
}) => {
  const validated = !isNameValid ? 'warning' : 'default';

  return (
    <FormGroup label="Model deployment name" fieldId="inference-service-name-input" isRequired>
      <TextInput
        isRequired
        id="inference-service-name-input"
        data-testid="inference-service-name-input"
        value={data.name}
        onChange={(e, name) => setData('name', name)}
        validated={validated}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            variant={validated}
            icon={isNameValid ? undefined : <ExclamationTriangleIcon />}
          >
            {isNameValid
              ? 'This is the name of the inference service created when the model is deployed'
              : 'Cannot exceed 253 characters'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default InferenceServiceNameSection;
