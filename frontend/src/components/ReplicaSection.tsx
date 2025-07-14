import * as React from 'react';
import { FormGroup, Popover, Icon, Flex, FlexItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { normalizeBetween } from '#~/utilities/utils';

const lowerLimit = 0;
const upperLimit = 99;

type ReplicaSectionProps = {
  value: number;
  onChange: (value: number) => void;
  infoContent?: string;
  isRequired?: boolean;
  showMinMax: boolean;
  maxValue: number;
  onMaxChange?: (value: number) => void;
};

const ReplicaFormGroup: React.FC<ReplicaSectionProps> = ({
  value,
  onChange,
  infoContent,
  isRequired = false,
  showMinMax = true,
  maxValue,
  onMaxChange,
}) => {
  const maxLimit = showMinMax ? upperLimit : maxValue;

  return (
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
      <Flex>
        <FlexItem>
          {!showMinMax && (
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Minimum replicas</span>}
              fieldId="min-replicas"
              data-testid="min-replicas"
            >
              <NumberInputWrapper
                min={lowerLimit}
                max={maxLimit}
                value={value}
                onChange={(val) => {
                  const newSize = val === undefined ? 0 : Number(val);
                  if (!Number.isNaN(newSize) && newSize <= maxLimit) {
                    onChange(normalizeBetween(newSize, lowerLimit, maxLimit));
                  }
                }}
              />
            </FormGroup>
          )}
          {showMinMax && (
            <NumberInputWrapper
              min={lowerLimit}
              max={upperLimit}
              value={value}
              onChange={(val) => {
                const newSize = val === undefined ? 0 : Number(val);
                if (!Number.isNaN(newSize) && newSize <= upperLimit) {
                  onChange(normalizeBetween(newSize, lowerLimit, upperLimit));
                }
              }}
            />
          )}
        </FlexItem>
        {!showMinMax && onMaxChange && (
          <FlexItem>
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Maximum replicas</span>}
              fieldId="max-replicas"
              data-testid="max-replicas"
            >
              <NumberInputWrapper
                min={value}
                max={upperLimit}
                value={maxValue}
                onChange={(val) => {
                  const newSize = val === undefined ? 0 : Number(val);
                  if (!Number.isNaN(newSize) && newSize <= upperLimit && newSize >= value) {
                    onMaxChange(normalizeBetween(newSize, value, upperLimit));
                  }
                }}
              />
            </FormGroup>
          </FlexItem>
        )}
      </Flex>
    </FormGroup>
  );
};

export default ReplicaFormGroup;
