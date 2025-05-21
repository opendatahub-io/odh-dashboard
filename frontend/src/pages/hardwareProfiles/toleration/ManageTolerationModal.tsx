import React from 'react';
import {
  Alert,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  InputGroup,
  InputGroupText,
  Popover,
  Radio,
  Stack,
  StackItem,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { Toleration, TolerationEffect, TolerationOperator } from '~/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import SimpleSelect from '~/components/SimpleSelect';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { asEnumMember } from '~/utilities/utils';
import { useValidation } from '~/utilities/useValidation';
import { tolerationSchema } from '~/pages/hardwareProfiles/manage/validationUtils';
import { effectDropdownOptions, EMPTY_TOLERATION, operatorDropdownOptions } from './const';

type ManageTolerationModalProps = {
  onClose: () => void;
  existingToleration?: Toleration;
  onSave: (toleration: Toleration) => void;
};

const ManageTolerationModal: React.FC<ManageTolerationModalProps> = ({
  onClose,
  existingToleration,
  onSave,
}) => {
  const [toleration, setToleration] = useGenericObjectState<Toleration>(
    existingToleration || EMPTY_TOLERATION,
  );
  const showAlertForValue = toleration.operator === TolerationOperator.EXISTS && toleration.value;
  const showAlertForTolerationSeconds =
    toleration.effect !== TolerationEffect.NO_EXECUTE && toleration.tolerationSeconds !== undefined;

  const handleSubmit = () => {
    onSave(toleration);
    onClose();
  };

  const isValidated = useValidation(toleration, tolerationSchema);

  return (
    <Modal variant="medium" isOpen onClose={onClose}>
      <ModalHeader title={existingToleration ? 'Edit toleration' : 'Add toleration'} />
      <ModalBody>
        <Form>
          <FormGroup label="Operator" fieldId="operator-select">
            <SimpleSelect
              isFullWidth
              options={operatorDropdownOptions}
              value={toleration.operator}
              onChange={(key) => {
                const operator = asEnumMember(key, TolerationOperator);
                setToleration('operator', operator ?? undefined);
              }}
              dataTestId="toleration-operator-select"
            />
          </FormGroup>
          <FormGroup label="Effect" fieldId="effect-select">
            <SimpleSelect
              isFullWidth
              options={effectDropdownOptions}
              value={toleration.effect}
              onChange={(key) => {
                const effect = asEnumMember(key, TolerationEffect);
                setToleration('effect', effect ?? undefined);
              }}
              dataTestId="toleration-effect-select"
            />
          </FormGroup>
          <FormGroup label="Key" isRequired fieldId="toleration-key">
            <TextInput
              id="toleration-key"
              value={toleration.key}
              onChange={(_, value) => setToleration('key', value)}
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
                  onChange={(_, value) => setToleration('value', value)}
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
            label="Toleration seconds"
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
                      onChange={() => setToleration('tolerationSeconds', undefined)}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Radio
                      id="custom-value"
                      name="tolerationSeconds"
                      label="Custom value"
                      isChecked={toleration.tolerationSeconds !== undefined}
                      onChange={() => {
                        setToleration('tolerationSeconds', 0);
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
                        setToleration('tolerationSeconds', value || 0);
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
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={existingToleration ? 'Update' : 'Add'}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitDisabled={!isValidated.validationResult.success}
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageTolerationModal;
