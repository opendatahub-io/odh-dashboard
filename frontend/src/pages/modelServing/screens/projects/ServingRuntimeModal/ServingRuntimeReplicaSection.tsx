import * as React from 'react';
import { FormGroup, FormSection, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { normalizeBetween } from '~/utilities/utils';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  infoContent?: string;
};

const MIN_SIZE = 0;
const MAX_SIZE = 999;

const ServingRuntimeReplicaSection: React.FC<ServingRuntimeReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => (
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
      <NumberInputWrapper
        min={MIN_SIZE}
        max={MAX_SIZE}
        onChange={(value) => {
          const newSize = Number(value);
          if (!Number.isNaN(newSize) && newSize <= MAX_SIZE) {
            setData('numReplicas', normalizeBetween(newSize, MIN_SIZE, MAX_SIZE));
          }
        }}
        value={data.numReplicas}
      />
    </FormGroup>
  </FormSection>
);

export default ServingRuntimeReplicaSection;
