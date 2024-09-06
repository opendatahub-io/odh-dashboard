import * as React from 'react';
import { FormGroup, HelperText, StackItem, TextInput } from '@patternfly/react-core';
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
  onDataChange: K8sNameDescriptionFieldUpdateFunction;
};

/** Sub-resource; not for public cunsumption */
const ResourceNameField: React.FC<ResourceNameFieldProps> = ({
  allowEdit,
  dataTestId,
  k8sName,
  onDataChange,
}) => {
  if (k8sName.state.immutable) {
    return (
      <StackItem>
        <FormGroup label="Resource name" labelIcon={<ResourceNameDefinitionTooltip />}>
          {k8sName.value}
        </FormGroup>
      </StackItem>
    );
  }

  if (!allowEdit) {
    return null;
  }

  return (
    <StackItem>
      <FormGroup label="Resource name" labelIcon={<ResourceNameDefinitionTooltip />}>
        <TextInput
          data-testid={`${dataTestId}-resourceName`}
          value={k8sName.value}
          onChange={(event, value) => onDataChange('k8sName', value)}
        />
        <HelperText>
          <HelperTextItemMaxLength k8sName={k8sName} />
          <HelperTextItemValidCharacters k8sName={k8sName} />
        </HelperText>
      </FormGroup>
    </StackItem>
  );
};

export default ResourceNameField;
