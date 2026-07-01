import * as React from 'react';
import { HelperText, HelperTextItem, TextInput, ValidatedOptions } from '@patternfly/react-core';
import { ThemeAwareFormGroupWrapper } from 'mod-arch-shared';
import { K8sNameDescriptionFieldData, K8sNameDescriptionFieldUpdateFunction } from './types';

type ResourceNameFieldProps = {
  allowEdit: boolean;
  dataTestId: string;
  k8sName: K8sNameDescriptionFieldData['k8sName'];
  onDataChange?: K8sNameDescriptionFieldUpdateFunction;
};

/** Sub-resource; not for public consumption */
const ResourceNameField: React.FC<ResourceNameFieldProps> = ({
  allowEdit,
  dataTestId,
  k8sName,
  onDataChange,
}) => {
  if (k8sName.state.immutable) {
    return (
      <ThemeAwareFormGroupWrapper label="Resource name" fieldId={`${dataTestId}-resource-name`}>
        <div>{k8sName.value}</div>
      </ThemeAwareFormGroupWrapper>
    );
  }

  if (!allowEdit) {
    return null;
  }

  let validated: ValidatedOptions = ValidatedOptions.default;
  if (k8sName.state.invalidLength || k8sName.state.invalidCharacters) {
    validated = ValidatedOptions.error;
  } else if (k8sName.value.length > 0) {
    validated = ValidatedOptions.success;
  }

  const textInput = (
    <TextInput
      aria-readonly={!onDataChange}
      id={`${dataTestId}-resourceName`}
      data-testid={`${dataTestId}-resourceName`}
      name={`${dataTestId}-resourceName`}
      type="text"
      isRequired
      value={k8sName.value}
      onChange={(_event, value) => onDataChange?.('k8sName', value)}
      validated={validated}
    />
  );

  const helperTextNode = (
    <HelperText>
      {k8sName.state.invalidLength && (
        <HelperTextItem variant="error">
          Cannot exceed {k8sName.state.maxLength} characters
        </HelperTextItem>
      )}
      {k8sName.state.invalidCharacters && (
        <HelperTextItem variant="error">
          Must start and end with a lowercase letter or number. Valid characters include lowercase
          letters, numbers, and hyphens (-).
        </HelperTextItem>
      )}
      {!k8sName.state.invalidLength && !k8sName.state.invalidCharacters && (
        <HelperTextItem>
          The resource name is used to identify your resource, and is generated based on the name
          you enter. The resource name cannot be edited after creation.
        </HelperTextItem>
      )}
    </HelperText>
  );

  return (
    <ThemeAwareFormGroupWrapper
      label="Resource name"
      className="resource-name"
      fieldId={`${dataTestId}-resource-name`}
      isRequired
      hasError={k8sName.state.invalidLength || k8sName.state.invalidCharacters}
      helperTextNode={helperTextNode}
    >
      {textInput}
    </ThemeAwareFormGroupWrapper>
  );
};

export default ResourceNameField;
