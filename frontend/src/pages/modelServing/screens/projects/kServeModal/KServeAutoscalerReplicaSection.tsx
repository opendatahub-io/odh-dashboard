import * as React from 'react';
import { FormGroup, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { normalizeBetween } from '~/utilities/utils';

//TODO: Convert this to autoscaling section
type KServeAutoscalerReplicaSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  infoContent?: string;
};

const MIN_SIZE = 0;
const MAX_SIZE = 999;

const KServeAutoscalerReplicaSection: React.FC<KServeAutoscalerReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => (
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
    fieldId="model-server-replicas"
    isRequired
  >
    <NumberInputWrapper
      min={MIN_SIZE}
      max={MAX_SIZE}
      onChange={(value) => {
        const newSize = Number(value);
        if (!Number.isNaN(newSize) && newSize <= MAX_SIZE) {
          setData('minReplicas', normalizeBetween(newSize, MIN_SIZE, MAX_SIZE));
          setData('maxReplicas', normalizeBetween(newSize, MIN_SIZE, MAX_SIZE));
        }
      }}
      value={data.minReplicas}
    />
  </FormGroup>
);

export default KServeAutoscalerReplicaSection;
