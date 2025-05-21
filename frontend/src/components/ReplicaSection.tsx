import * as React from 'react';
import { FormGroup, Popover, Icon, Flex, FlexItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { normalizeBetween } from '~/utilities/utils';

const MIN_SIZE = 0;
const MAX_SIZE = 999;
const ADVANCED_MAX_SIZE = 99;

type ReplicaSectionProps = {
  value: number;
  onChange: (value: number) => void;
  infoContent?: string;
  isRequired?: boolean;
  isRaw: boolean;
  maxValue: number;
  onMaxChange?: (value: number) => void;
};

const ReplicaSection: React.FC<ReplicaSectionProps> = ({
  value,
  onChange,
  infoContent,
  isRequired = false,
  isRaw = true,
  maxValue,
  onMaxChange,
}) => {
  const maxLimit = isRaw ? MAX_SIZE : maxValue;

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
          {!isRaw && (
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Minimum replicas</span>}
              fieldId="min-replicas"
              data-testid="min-replicas"
            >
              <NumberInputWrapper
                min={MIN_SIZE}
                max={maxLimit}
                value={value}
                onChange={(val) => {
                  const newSize = val === undefined ? 0 : Number(val);
                  if (!Number.isNaN(newSize) && newSize <= maxLimit) {
                    onChange(normalizeBetween(newSize, MIN_SIZE, maxLimit));
                  }
                }}
              />
            </FormGroup>
          )}
          {isRaw && (
            <NumberInputWrapper
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={value}
              onChange={(val) => {
                const newSize = val === undefined ? 0 : Number(val);
                if (!Number.isNaN(newSize) && newSize <= MAX_SIZE) {
                  onChange(normalizeBetween(newSize, MIN_SIZE, MAX_SIZE));
                }
              }}
            />
          )}
        </FlexItem>
        {!isRaw && onMaxChange && (
          <FlexItem>
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Maximum replicas</span>}
              fieldId="max-replicas"
              data-testid="max-replicas"
            >
              <NumberInputWrapper
                min={value}
                max={ADVANCED_MAX_SIZE}
                value={maxValue}
                onChange={(val) => {
                  const newSize = val === undefined ? 0 : Number(val);
                  if (!Number.isNaN(newSize) && newSize <= ADVANCED_MAX_SIZE && newSize >= value) {
                    onMaxChange(normalizeBetween(newSize, value, ADVANCED_MAX_SIZE));
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

export default ReplicaSection;
