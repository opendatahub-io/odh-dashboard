import * as React from 'react';
import { FormGroup, FormSection, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  infoContent?: string;
};

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
        min={0}
        max={999}
        onChange={(newValue) => setData('numReplicas', newValue ?? 0)}
        value={data.numReplicas}
      />
    </FormGroup>
  </FormSection>
);

export default ServingRuntimeReplicaSection;
