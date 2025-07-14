import * as React from 'react';
import { HelperTextItem } from '@patternfly/react-core';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';

type Variants = React.ComponentProps<typeof HelperTextItem>['variant'];

type HelperTextItemType = React.FC<{
  k8sName: K8sNameDescriptionFieldData['k8sName'];
}>;

export const HelperTextItemMaxLength: HelperTextItemType = ({ k8sName }) => {
  let variant: Variants = 'indeterminate';
  if (k8sName.state.invalidLength) {
    variant = 'error';
  } else if (k8sName.value.trim().length > 0) {
    variant = 'success';
  }

  return (
    <HelperTextItem variant={variant}>
      Cannot exceed {k8sName.state.maxLength} characters
    </HelperTextItem>
  );
};

export const HelperTextItemValidCharacters: HelperTextItemType = ({ k8sName }) => {
  let variant: Variants = 'indeterminate';
  if (k8sName.state.invalidCharacters) {
    variant = 'error';
  } else if (k8sName.value.trim().length > 0) {
    variant = 'success';
  }

  return (
    <HelperTextItem variant={variant}>
      {k8sName.state.invalidCharsMessage ||
        'Must start and end with a letter or number. Valid characters include lowercase letters, numbers, and hyphens (-).'}
    </HelperTextItem>
  );
};
