import * as React from 'react';
import { FormGroup, NumberInput, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { isHTMLInputElement, normalizeBetween } from '~/utilities/utils';

//TODO: Convert this to autoscaling section
type KServeAutoscalerReplicaSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  infoContent?: string;
};

const KServeAutoscalerReplicaSection: React.FC<KServeAutoscalerReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => {
  const MIN_SIZE = 0;

  const onStep = (step: number) => {
    setData('minReplicas', normalizeBetween(data.minReplicas + step, MIN_SIZE));
    setData('maxReplicas', normalizeBetween(data.maxReplicas + step, MIN_SIZE));
  };

  return (
    <FormGroup
      label="Number of model server replicas to deploy"
      labelHelp={
        infoContent ? (
          <Popover bodyContent={<div>{infoContent}</div>}>
            <Icon aria-label="Model server replicas info" role="button">
              <OutlinedQuestionCircleIcon />
            </Icon>
          </Popover>
        ) : undefined
      }
      fieldId="model-server-replicas"
      isRequired
    >
      <NumberInput
        inputProps={{ id: 'model-server-replicas' }}
        inputAriaLabel="model server replicas number input"
        value={data.minReplicas}
        widthChars={10}
        min={MIN_SIZE}
        onPlus={() => onStep(1)}
        onMinus={() => onStep(-1)}
        onChange={(event) => {
          if (isHTMLInputElement(event.target)) {
            const newSize = Number(event.target.value);
            setData(
              'minReplicas',
              Number.isNaN(newSize) ? MIN_SIZE : normalizeBetween(newSize, MIN_SIZE),
            );
            setData(
              'maxReplicas',
              Number.isNaN(newSize) ? MIN_SIZE : normalizeBetween(newSize, MIN_SIZE),
            );
          }
        }}
      />
    </FormGroup>
  );
};

export default KServeAutoscalerReplicaSection;
