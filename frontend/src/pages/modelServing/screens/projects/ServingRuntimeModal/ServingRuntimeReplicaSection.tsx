import * as React from 'react';
import { FormGroup, FormSection, NumberInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject } from '../../types';
import { isHTMLInputElement, normalizeBetween } from 'utilities/utils';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

const ServingRuntimeReplicaSection: React.FC<ServingRuntimeReplicaSectionProps> = ({
  data,
  setData,
}) => {
  const MIN_SIZE = 1;

  const onStep = (step: number) => {
    setData('numReplicas', normalizeBetween(data.numReplicas + step, MIN_SIZE));
  };

  return (
    <FormSection title="Model server replicas">
      <FormGroup label="Number of model server replicas to deploy">
        <NumberInput
          id="num-replicas-serving-runtime"
          value={data.numReplicas}
          widthChars={10}
          min={1}
          onPlus={() => onStep(1)}
          onMinus={() => onStep(-1)}
          onChange={(event) => {
            if (isHTMLInputElement(event.target)) {
              const newSize = Number(event.target.value);
              setData(
                'numReplicas',
                isNaN(newSize) ? MIN_SIZE : normalizeBetween(newSize, MIN_SIZE),
              );
            }
          }}
        />
      </FormGroup>
    </FormSection>
  );
};

export default ServingRuntimeReplicaSection;
