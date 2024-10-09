import * as React from 'react';
import { FormGroup, FormSection, NumberInput, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { isHTMLInputElement, normalizeBetween } from '~/utilities/utils';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  infoContent?: string;
};

const ServingRuntimeReplicaSection: React.FC<ServingRuntimeReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => {
  const MIN_SIZE = 0;

  const onStep = (step: number) => {
    setData('numReplicas', normalizeBetween(data.numReplicas + step, MIN_SIZE));
  };

  return (
    <FormSection title="Model server replicas">
      <FormGroup
        label="Number of model server replicas to deploy"
        data-testid="model-server-replicas"
        labelHelp={
          infoContent ? (
            <Popover bodyContent={<div>{infoContent}</div>}>
              <Icon aria-label="Model server replicas info" role="button">
                <OutlinedQuestionCircleIcon />
              </Icon>
            </Popover>
          ) : undefined
        }
      >
        <NumberInput
          inputAriaLabel="model server replicas number input"
          value={data.numReplicas}
          widthChars={10}
          min={MIN_SIZE}
          onPlus={() => onStep(1)}
          onMinus={() => onStep(-1)}
          onChange={(event) => {
            if (isHTMLInputElement(event.target)) {
              const newSize = Number(event.target.value);
              setData(
                'numReplicas',
                Number.isNaN(newSize) ? MIN_SIZE : normalizeBetween(newSize, MIN_SIZE),
              );
            }
          }}
        />
      </FormGroup>
    </FormSection>
  );
};

export default ServingRuntimeReplicaSection;
