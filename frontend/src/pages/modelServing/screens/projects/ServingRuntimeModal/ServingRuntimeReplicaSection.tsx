import * as React from 'react';
import { FormGroup, FormSection, NumberInput, ValidatedOptions } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject } from '../../types';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

const ServingRuntimeReplicaSection: React.FC<ServingRuntimeReplicaSectionProps> = ({
  data,
  setData,
}) => {
  const onChangeReplicas = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    setData('numReplicas', parseInt(target.value));
  };
  const validate = data.numReplicas >= 0 ? ValidatedOptions.default : ValidatedOptions.error;

  return (
    <FormSection title="Model server replicas">
      <FormGroup label="Number of model server replicas to deploy">
        <NumberInput
          value={data.numReplicas}
          widthChars={10}
          min={1}
          validated={validate}
          onChange={onChangeReplicas}
          onMinus={() => setData('numReplicas', data.numReplicas - 1)}
          onPlus={() => setData('numReplicas', data.numReplicas + 1)}
        />
      </FormGroup>
    </FormSection>
  );
};

export default ServingRuntimeReplicaSection;
