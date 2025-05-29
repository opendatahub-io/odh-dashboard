import React from 'react';

import {
  Form,
  FormGroup,
  TextInput,
  Alert,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  TextArea,
  Flex,
  FlexItem,
  AlertProps,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';

import { StorageClassKind } from '#~/k8sTypes';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { updateStorageClassConfig } from '#~/api';
import { getStorageClassConfig, isOpenshiftDefaultStorageClass, isValidConfigValue } from './utils';
import { OpenshiftDefaultLabel } from './OpenshiftDefaultLabel';

interface StorageClassEditModalProps {
  storageClass: StorageClassKind;
  alert?: Partial<Pick<AlertProps, 'title' | 'children'>>;
  onSuccess: () => Promise<StorageClassKind[] | void>;
  onClose: () => void;
}

export const StorageClassEditModal: React.FC<StorageClassEditModalProps> = ({
  storageClass,
  alert,
  onSuccess,
  onClose,
}) => {
  const { name: storageClassName } = storageClass.metadata;
  const storageClassConfig = getStorageClassConfig(storageClass);
  const [displayName, setDisplayName] = React.useState(
    isValidConfigValue('displayName', storageClassConfig?.displayName)
      ? storageClassConfig?.displayName
      : '',
  );
  const [description, setDescription] = React.useState(
    isValidConfigValue('description', storageClassConfig?.description)
      ? storageClassConfig?.description
      : '',
  );
  const [updateError, setUpdateError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSave = async () => {
    setIsSubmitting(true);

    try {
      await updateStorageClassConfig(storageClassName, {
        displayName,
        description,
        ...(storageClassConfig?.isDefault === undefined && { isDefault: false }),
        ...(storageClassConfig?.isEnabled === undefined && { isEnabled: false }),
      });
      await onSuccess();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setUpdateError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen variant="small" onClose={onClose} data-testid="edit-sc-modal">
      <ModalHeader title="Edit storage class details" />
      <ModalBody>
        <Alert
          isInline
          variant="info"
          title="Editing these details will not affect the storage class in OpenShift."
          {...alert}
          className="pf-v6-u-mb-lg"
          data-testid="edit-sc-modal-info-alert"
        />

        <Form id="edit-sc-form">
          {(!alert || alert.children) && (
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>OpenShift storage class</DescriptionListTerm>
                <DescriptionListDescription data-testid="edit-sc-openshift-class-name">
                  <Flex
                    spaceItems={{ default: 'spaceItemsSm' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>{storageClassName}</FlexItem>
                    {isOpenshiftDefaultStorageClass(storageClass) && <OpenshiftDefaultLabel />}
                  </Flex>
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Provisioner</DescriptionListTerm>
                <DescriptionListDescription data-testid="edit-sc-provisioner">
                  {storageClass.provisioner}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          )}

          <FormGroup label="Display name" isRequired fieldId="edit-sc-display-name">
            <TextInput
              isRequired
              value={displayName}
              onChange={(_, value) => setDisplayName(value)}
              id="edit-sc-display-name"
              data-testid="edit-sc-display-name"
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="edit-sc-description">
            <TextArea
              value={description}
              onChange={(_, value) => setDescription(value)}
              resizeOrientation="vertical"
              autoResize
              id="edit-sc-description"
              data-testid="edit-sc-description"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={onSave}
          submitLabel="Save"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!displayName || isSubmitting}
          error={updateError}
          alertTitle="Error updating storage class"
        />
      </ModalFooter>
    </Modal>
  );
};
