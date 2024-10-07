import * as React from 'react';
import { FormGroup, HelperText, TextInput, ValidatedOptions } from '@patternfly/react-core';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import {
  HelperTextItemMaxLength,
  HelperTextItemValidCharacters,
} from '~/concepts/k8s/K8sNameDescriptionField/HelperTextItemVariants';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '~/concepts/k8s/K8sNameDescriptionField/types';

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
  if (k8sName.state.invalidLength || k8sName.state.invalidCharacters) {
    validated = ValidatedOptions.error;
  } else if (k8sName.value.length > 0) {
    validated = ValidatedOptions.success;
  }

  return (
    <FormGroup {...formGroupProps} isRequired>
      <TextInput
        data-testid={`${dataTestId}-resourceName`}
        name={`${dataTestId}-resourceName`}
        isRequired
        value={k8sName.value}
        onChange={(event, value) => onDataChange?.('k8sName', value)}
        validated={validated}
      />
      <HelperText>
        <HelperTextItemMaxLength k8sName={k8sName} />
        <HelperTextItemValidCharacters k8sName={k8sName} />
      </HelperText>
    </FormGroup>
  );
};

export default ResourceNameField;
