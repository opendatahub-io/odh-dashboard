import React, { FormEvent } from 'react';
import {
  TextInput,
  FormGroup,
  Popover,
  Icon,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
  HelperTextItemProps,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { NameDescType, K8sNameValidationState, IndeterminateOption } from '~/pages/projects/types';
import { isK8sNameValid } from '~/pages/projects/utils';

type K8sNameFieldProps = {
  data: NameDescType;
  setData: (data: NameDescType) => void;
  nameFieldId: string;
  disableK8sName?: boolean;
  validateK8sName: K8sNameValidationState;
  setValidateK8sName: React.Dispatch<React.SetStateAction<K8sNameValidationState>>;
};
const combinedValidationStatus = {
  ...ValidatedOptions,
  ...IndeterminateOption,
};
const K8sNameField: React.FC<K8sNameFieldProps> = ({
  nameFieldId,
  disableK8sName,
  data,
  setData,
  validateK8sName,
  setValidateK8sName,
}) => {
  const { ruleLength, ruleCharacterTypes } = validateK8sName;

  const handlek8sNameChange = (event: FormEvent<HTMLInputElement>, k8sName: string) => {
    const isK8sNameLengthExceeded = k8sName.length >= 30;
    const isK8sNameValidated = isK8sNameValid(k8sName);
    const isK8sNameEmpty = data.k8sName?.value?.length === 0;

    if (isK8sNameLengthExceeded) {
      setValidateK8sName({
        ruleCharacterTypes: isK8sNameValidated
          ? combinedValidationStatus.success
          : combinedValidationStatus.error,
        ruleLength: combinedValidationStatus.warning,
      });

      setData({
        ...data,
        k8sName: {
          value: k8sName.slice(0, 30),
          isTruncated: true,
          isUserInputK8sName: true,
        },
      });
    } else {
      setData({
        ...data,
        k8sName: {
          value: k8sName,
          isTruncated: false,
          isUserInputK8sName: true,
        },
      });

      if (isK8sNameEmpty) {
        setValidateK8sName({
          ruleCharacterTypes: combinedValidationStatus.indeterminate,
          ruleLength: combinedValidationStatus.indeterminate,
        });
      } else {
        setValidateK8sName({
          ruleCharacterTypes: isK8sNameValidated
            ? combinedValidationStatus.success
            : combinedValidationStatus.error,
          ruleLength: combinedValidationStatus.success,
        });
      }
    }
  };

  return (
    <FormGroup
      label="Resource name"
      labelIcon={
        <Popover
          aria-label="Resource name"
          headerContent={<div>Resource name</div>}
          bodyContent={
            <div>
              The resource name is used to identify your resource in OpenShift, and is not editable
              after creation.
            </div>
          }
        >
          <Icon aria-label="Resource name info" role="button">
            <OutlinedQuestionCircleIcon />
          </Icon>
        </Popover>
      }
      isRequired
      fieldId={`resource-${nameFieldId}`}
    >
      <TextInput
        isRequired
        isDisabled={disableK8sName}
        id={`resource-${nameFieldId}`}
        name={`resource-${nameFieldId}`}
        value={data.k8sName?.value}
        onChange={handlek8sNameChange}
        validated={
          ruleCharacterTypes === 'error'
            ? ValidatedOptions.error
            : ruleLength === 'warning'
            ? ValidatedOptions.warning
            : ValidatedOptions.default
        }
      />
      {!disableK8sName && (
        <HelperText component="ul">
          <HelperTextItem
            component="li"
            id="ruleLength"
            isDynamic
            variant={ruleLength as HelperTextItemProps['variant']}
          >
            {`Cannot exceed 30 characters. Otherwise, the excess will be truncated.`}
          </HelperTextItem>
          <HelperTextItem
            component="li"
            id="ruleCharacterTypes"
            isDynamic
            variant={ruleCharacterTypes as HelperTextItemProps['variant']}
          >
            {`Must consist of lower case alphanumeric characters or '-', and must start and end
        with an alphanumeric character.`}
          </HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};
export default K8sNameField;
