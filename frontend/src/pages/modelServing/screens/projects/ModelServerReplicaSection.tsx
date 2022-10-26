import * as React from 'react';
import { FormGroup, FormSection, NumberInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingModelServerObject } from '../types';

type ModelServerReplicaSectionProps = {
  data: CreatingModelServerObject;
  setData: UpdateObjectAtPropAndValue<CreatingModelServerObject>;
};

const ModelServerReplicaSection: React.FC<ModelServerReplicaSectionProps> = ({ data, setData }) => {
  const onChangeReplicas = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    setData('numReplicas', parseInt(target.value));
  };
  return (
    <FormSection title="Model server replicas">
      <FormGroup label="Number of model server replicas to deploy">
        <NumberInput
          value={data.numReplicas}
          widthChars={10}
          min={1}
          onChange={onChangeReplicas}
          onMinus={() => setData('numReplicas', data.numReplicas - 1)}
          onPlus={() => setData('numReplicas', data.numReplicas + 1)}
        />
      </FormGroup>
    </FormSection>
  );
};

export default ModelServerReplicaSection;
