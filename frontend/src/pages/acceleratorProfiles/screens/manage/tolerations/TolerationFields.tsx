import React from 'react';
import {
  Radio,
  TextInput,
  FormGroup,
  Alert,
  Flex,
  FlexItem,
  StackItem,
  Stack,
  InputGroup,
  InputGroupText,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Toleration, TolerationEffect, TolerationOperator } from '#~/types';
import SimpleSelect from '#~/components/SimpleSelect';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { effectDropdownOptions, operatorDropdownOptions } from './const';

type TolerationFieldsProps = {
  toleration: Toleration;
  onUpdate: (data: Toleration) => void;
};

const TolerationFields: React.FC<TolerationFieldsProps> = ({ toleration, onUpdate }) => {
  const handleFieldUpdate = (field: keyof Toleration, value: unknown) => {
    onUpdate({ ...toleration, [field]: value });
  };

  const showAlertForValue = toleration.operator === TolerationOperator.EXISTS && toleration.value;
  const showAlertForTolerationSeconds =
    toleration.effect !== TolerationEffect.NO_EXECUTE && toleration.tolerationSeconds !== undefined;

  return (
    <>
      <FormGroup label="Operator" fieldId="operator-select">
        <SimpleSelect
          isFullWidth
          options={operatorDropdownOptions}
          value={toleration.operator}
          onChange={(key) => handleFieldUpdate('operator', key)}
          dataTestId="toleration-operator-select"
        />
      </FormGroup>

      <FormGroup label="Effect" fieldId="effect-select">
        <SimpleSelect
          isFullWidth
          options={effectDropdownOptions}
          value={toleration.effect}
          onChange={(key) => handleFieldUpdate('effect', key)}
          dataTestId="toleration-effect-select"
        />
      </FormGroup>

      <FormGroup label="Key" isRequired fieldId="toleration-key">
        <TextInput
          id="toleration-key"
          value={toleration.key || ''}
          onChange={(_, value) => handleFieldUpdate('key', value)}
          aria-label="Toleration key field"
          data-testid="toleration-key-input"
        />
      </FormGroup>
      <FormGroup label="Value" fieldId="toleration-value">
        <Stack hasGutter>
          <StackItem>
            <TextInput
              id="toleration-value"
              value={toleration.value || ''}
              onChange={(_, value) => handleFieldUpdate('value', value)}
              aria-label="Toleration value field"
              data-testid="toleration-value-input"
            />
          </StackItem>
          {showAlertForValue && (
            <StackItem>
              <Alert
                variant="info"
                isPlain
                isInline
                title="Value should be empty when operator is Exists."
                data-testid="toleration-value-alert"
              />
            </StackItem>
          )}
        </Stack>
      </FormGroup>

      <FormGroup
        label="Toleration Seconds"
        fieldId="toleration-seconds"
        labelHelp={
          <Popover bodyContent="Toleration seconds specifies how long a pod can remain bound to a node before being evicted.">
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info for toleration seconds field"
            />
          </Popover>
        }
      >
        <Stack hasGutter>
          <StackItem>
            <Flex>
              <FlexItem>
                <Radio
                  id="forever"
                  name="tolerationSeconds"
                  label="Forever"
                  isChecked={toleration.tolerationSeconds === undefined}
                  onChange={() => handleFieldUpdate('tolerationSeconds', undefined)}
                />
              </FlexItem>
              <FlexItem>
                <Radio
                  id="custom-value"
                  name="tolerationSeconds"
                  label="Custom value"
                  isChecked={toleration.tolerationSeconds !== undefined}
                  onChange={() => {
                    handleFieldUpdate('tolerationSeconds', 0);
                  }}
                  data-testid="toleration-seconds-radio-custom"
                />
              </FlexItem>
            </Flex>
          </StackItem>
          {toleration.tolerationSeconds !== undefined && (
            <StackItem>
              <InputGroup>
                <NumberInputWrapper
                  min={0}
                  value={toleration.tolerationSeconds}
                  onChange={(value) => {
                    handleFieldUpdate('tolerationSeconds', value || 0);
                  }}
                />
                <InputGroupText isPlain>second(s)</InputGroupText>
              </InputGroup>
            </StackItem>
          )}
          {showAlertForTolerationSeconds && (
            <StackItem>
              <Alert
                variant="info"
                isInline
                isPlain
                title="Toleration seconds are ignored unless effect is NoExecute"
                data-testid="toleration-seconds-alert"
              />
            </StackItem>
          )}
        </Stack>
      </FormGroup>
    </>
  );
};

export default TolerationFields;
