import * as React from 'react';
import { FormGroup, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { normalizeBetween } from '~/utilities/utils';

const MIN_SIZE = 0;
const MAX_SIZE = 999;

type ReplicaSectionProps = {
  value: number;
  onChange: (value: number) => void;
  infoContent?: string;
  isRequired?: boolean;
};

const ReplicaSection: React.FC<ReplicaSectionProps> = ({
  value,
  onChange,
  infoContent,
  isRequired = false,
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
    isRequired={isRequired}
  >
    <NumberInputWrapper
      min={MIN_SIZE}
      max={MAX_SIZE}
      value={value}
      onChange={(val) => {
        const newSize = Number(val);
        if (!Number.isNaN(newSize) && newSize <= MAX_SIZE) {
          onChange(normalizeBetween(newSize, MIN_SIZE, MAX_SIZE));
        }
      }}
    />
  </FormGroup>
);

export default ReplicaSection;
