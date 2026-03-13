import * as React from 'react';
import { HelperTextItem } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { NameAvailabilityStatus } from './K8sNameDescriptionField';

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

export const HelperTextItemResourceNameTaken: React.FC<{
  resourceNameTakenMessage: React.ReactNode;
}> = ({ resourceNameTakenMessage }) => {
  return (
    <HelperTextItem
      icon={<ExclamationCircleIcon />}
      variant="error"
      data-testid="resource-name-taken-error"
    >
      {resourceNameTakenMessage}
    </HelperTextItem>
  );
};

export const HelperTextUniqueName: React.FC<{
  nameAvailabilityStatus: NameAvailabilityStatus;
}> = ({ nameAvailabilityStatus }) => {
  // Only show if there's an actual status (not UNCHECKED)
  if (nameAvailabilityStatus === NameAvailabilityStatus.UNCHECKED) {
    return null;
  }

  let variant: Variants = 'indeterminate';
  if (nameAvailabilityStatus === NameAvailabilityStatus.VALID) {
    variant = 'success';
  } else if (nameAvailabilityStatus === NameAvailabilityStatus.INVALID) {
    variant = 'error';
  }

  return (
    <HelperTextItem variant={variant} data-testid="resource-name-unique">
      Must be unique
    </HelperTextItem>
  );
};
