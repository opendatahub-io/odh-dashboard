import * as React from 'react';
import { FormGroup, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';

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
}) => (
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
    <NumberInputWrapper
      min={0}
      max={999}
      onChange={(newValue) => setData('minReplicas', newValue ?? 0)}
      value={data.minReplicas}
    />
  </FormGroup>
);

export default KServeAutoscalerReplicaSection;
