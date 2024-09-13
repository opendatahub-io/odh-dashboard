import React from 'react';

import {
  Modal,
  ModalVariant,
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
} from '@patternfly/react-core';

import { StorageClassKind } from '~/k8sTypes';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { getStorageClassConfig, isOpenshiftDefaultStorageClass } from './utils';
import { OpenshiftDefaultLabel } from './OpenshiftDefaultLabel';

interface StorageClassEditModalProps {
  storageClass: StorageClassKind;
  onSuccess: () => Promise<StorageClassKind[] | void>;
  onClose: () => void;
}

export const StorageClassEditModal: React.FC<StorageClassEditModalProps> = ({
  storageClass,
  onSuccess,
  onClose,
}) => {
  const { name: storageClassName } = storageClass.metadata;
  const storageClassConfig = getStorageClassConfig(storageClass);
  const [displayName, setDisplayName] = React.useState(storageClassConfig?.displayName ?? '');
  const [description, setDescription] = React.useState(storageClassConfig?.description ?? '');
  const [updateError, setUpdateError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSave = async () => {
    setIsSubmitting(true);

    try {
      await updateStorageClassConfig(storageClassName, { displayName, description });
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
    <Modal
      isOpen
      variant={ModalVariant.small}
      title="Edit storage class details"
      onClose={onClose}
      footer={
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={onSave}
          submitLabel="Save"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!displayName || isSubmitting}
          error={updateError}
          alertTitle="Error updating storage class"
        />
      }
      data-testid="edit-sc-modal"
    >
      <Alert
        isInline
        variant="info"
        title="Editing these details will not affect the storage class in OpenShift."
        className="pf-v5-u-mb-lg"
      />

      <Form id="edit-sc-form">
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
    </Modal>
  );
};
