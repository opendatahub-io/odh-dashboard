import * as React from 'react';
import {
  FormGroup,
  HelperText,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import ResourceNameDefinitionTooltip from '#~/concepts/k8s/ResourceNameDefinitionTooltip';
import {
  HelperTextItemMaxLength,
  HelperTextItemResourceNameTaken,
  HelperTextItemValidCharacters,
  HelperTextUniqueName,
} from '#~/concepts/k8s/K8sNameDescriptionField/HelperTextItemVariants';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { NameAvailabilityStatus } from './K8sNameDescriptionField.tsx';

type ResourceNameFieldProps = {
  allowEdit: boolean;
  dataTestId: string;
  k8sName: K8sNameDescriptionFieldData['k8sName'];
  onDataChange?: K8sNameDescriptionFieldUpdateFunction;
  resourceNameTakenHelperText?: React.ReactNode;
  nameAvailabilityValidation?: ValidatedOptions;
  nameAvailabilityStatus?: NameAvailabilityStatus;
};

/** Sub-resource; not for public consumption */
const ResourceNameField: React.FC<ResourceNameFieldProps> = ({
  allowEdit,
  dataTestId,
  k8sName,
  onDataChange,
  resourceNameTakenHelperText,
  nameAvailabilityValidation,
  nameAvailabilityStatus,
}) => {
  const formGroupProps: React.ComponentProps<typeof FormGroup> = {
    label: 'Resource name',
    labelHelp: <ResourceNameDefinitionTooltip />,
    fieldId: `${dataTestId}-resourceName`,
  };

  if (k8sName.state.immutable) {
    return <FormGroup {...formGroupProps}>{k8sName.value}</FormGroup>;
  }

  if (!allowEdit) {
    return null;
  }

  let validated: ValidatedOptions = ValidatedOptions.default;
  if (
    nameAvailabilityValidation === ValidatedOptions.error ||
    k8sName.state.invalidLength ||
    k8sName.state.invalidCharacters ||
    !!resourceNameTakenHelperText
  ) {
    validated = ValidatedOptions.error;
  } else if (k8sName.value.length > 0 && !resourceNameTakenHelperText) {
    validated = ValidatedOptions.success;
  }

  const usePrefix = k8sName.state.staticPrefix && !!k8sName.state.safePrefix;
  const textInput = (
    <TextInput
      id={`${dataTestId}-resourceName`}
      data-testid={`${dataTestId}-resourceName`}
      name={`${dataTestId}-resourceName`}
      isRequired
      value={
        usePrefix && k8sName.state.safePrefix
          ? k8sName.value.replace(new RegExp(`^${k8sName.state.safePrefix}`), '')
          : k8sName.value
      }
      onChange={(event, value) =>
        onDataChange?.(
          'k8sName',
          usePrefix && k8sName.state.safePrefix ? `${k8sName.state.safePrefix}${value}` : value,
        )
      }
      validated={validated}
      isDisabled={nameAvailabilityStatus === NameAvailabilityStatus.IN_PROGRESS}
    />
  );
  return (
    <FormGroup {...formGroupProps} isRequired>
      {usePrefix ? (
        <InputGroup>
          <InputGroupText>{k8sName.state.safePrefix}</InputGroupText>
          <InputGroupItem isFill>{textInput}</InputGroupItem>
        </InputGroup>
      ) : (
        textInput
      )}
      <HelperText>
        {nameAvailabilityStatus && (
          <HelperTextUniqueName nameAvailabilityStatus={nameAvailabilityStatus} />
        )}
        <HelperTextItemMaxLength k8sName={k8sName} />
        <HelperTextItemValidCharacters k8sName={k8sName} />
        {resourceNameTakenHelperText && (
          <HelperTextItemResourceNameTaken resourceNameTakenMessage={resourceNameTakenHelperText} />
        )}
      </HelperText>
    </FormGroup>
  );
};

export default ResourceNameField;
