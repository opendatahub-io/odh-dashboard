import {
  Form,
  FormGroup,
  TextInput,
  Alert,
  AlertProps,
  Checkbox,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextArea,
  Tooltip,
} from '@patternfly/react-core';

import React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { accessModeDescriptions } from '#~/pages/storageClasses/constants';
import { StorageClassKind } from '#~/k8sTypes';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { updateStorageClassConfig } from '#~/api';
import {
  getStorageClassConfig,
  getStorageClassDefaultAccessModeSettings,
  isOpenshiftDefaultStorageClass,
  isValidAccessModeSettings,
  isValidConfigValue,
} from './utils';
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

  const defaultAccessModeSettings = getStorageClassDefaultAccessModeSettings(storageClass);

  const [accessModeSettings, setAccessModeSettings] = React.useState(
    isValidAccessModeSettings(storageClass, storageClassConfig?.accessModeSettings)
      ? storageClassConfig?.accessModeSettings ?? defaultAccessModeSettings
      : defaultAccessModeSettings,
  );
  const [showAccessModeAlert, setShowAccessModeAlert] = React.useState(false);

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
        accessModeSettings,
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

          <FormGroup
            label="Access mode enablement"
            labelHelp={
              <FieldGroupHelpLabelIcon
                content={
                  <Stack hasGutter>
                    <StackItem>
                      Access mode is a Kubernetes concept that determines how nodes can interact
                      with the volume.
                    </StackItem>
                    <StackItem>
                      Users can create storage using enabled access modes. The OpenShift storage
                      class determines which access modes (RWO, RWX, ROX and RWOP) are supported by
                      default.
                    </StackItem>
                  </Stack>
                }
              />
            }
            fieldId="edit-sc-access-mode"
            isStack
          >
            {Object.entries(AccessMode).map(([modeLabel, modeName]) => {
              const isSupported = modeName in accessModeSettings;
              const checkbox = (
                <Checkbox
                  label={`${modeName} (${modeLabel})`}
                  description={accessModeDescriptions[modeName]}
                  isDisabled={!isSupported || modeName === AccessMode.RWO}
                  isChecked={isSupported && accessModeSettings[modeName] === true}
                  aria-label={modeLabel}
                  key={modeLabel}
                  id={`edit-sc-access-mode-${modeLabel.toLowerCase()}`}
                  data-testid={`edit-sc-access-mode-checkbox-${modeLabel.toLowerCase()}`}
                  onChange={(_, enabled) => {
                    if (modeName === AccessMode.RWX) {
                      if (!enabled && storageClassConfig?.accessModeSettings[AccessMode.RWX]) {
                        setShowAccessModeAlert(true);
                      } else {
                        setShowAccessModeAlert(false);
                      }
                    }
                    setAccessModeSettings((prev) => ({
                      ...prev,
                      [modeName]: enabled,
                    }));
                  }}
                />
              );

              if (!isSupported) {
                return (
                  <Tooltip
                    content="This mode is not available in this class."
                    key={`${modeLabel}-tooltip`}
                    position="top-start"
                  >
                    {checkbox}
                  </Tooltip>
                );
              }

              return checkbox;
            })}
          </FormGroup>
          {showAccessModeAlert && (
            <Alert
              variant="warning"
              title="Disabling the RWX access mode will prevent new storage of this class from using
               this access mode. Existing storage will be unaffected."
              isInline
              data-testid="edit-sc-access-mode-alert"
            />
          )}
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
