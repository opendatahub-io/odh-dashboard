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
} from '@patternfly/react-core';

import React from 'react';
import { AccessMode, AccessModeLabelMap } from '#~/pages/storageClasses/storageEnums';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { accessModeDescriptions } from '#~/pages/storageClasses/constants';
import { StorageClassKind } from '#~/k8sTypes';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { updateStorageClassConfig } from '#~/api';
import { toAccessModeFullName } from '#~/pages/projects/screens/detail/storage/AccessModeFullName.tsx';
import {
  getSupportedAccessModesForProvisioner,
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

  const defaultAccessModeSettings = getStorageClassDefaultAccessModeSettings();

  const [accessModeSettings, setAccessModeSettings] = React.useState(() => {
    const settings = storageClassConfig?.accessModeSettings;
    if (settings && isValidAccessModeSettings(settings)) {
      return settings;
    }
    return defaultAccessModeSettings;
  });
  const [showAccessModeAlert, setShowAccessModeAlert] = React.useState(false);
  const [accessModeMismatch, setAccessModeMismatch] = React.useState<{
    recommended: AccessMode[];
    unsupported: AccessMode[];
  } | null>(null);

  const [updateError, setUpdateError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const recommended = getSupportedAccessModesForProvisioner(storageClass.provisioner);

    if (recommended === null) {
      setAccessModeMismatch(null);
      return;
    }

    const selectedModes = Object.values(AccessMode).filter(
      (mode) => accessModeSettings[mode] === true || mode === AccessMode.RWO,
    );

    const unsupported = selectedModes.filter((mode) => !recommended.includes(mode));

    if (unsupported.length > 0) {
      setAccessModeMismatch({ recommended, unsupported });
    } else {
      setAccessModeMismatch(null);
    }
  }, [accessModeSettings, storageClass.provisioner]);

  const onSave = async () => {
    setIsSubmitting(true);

    try {
      await updateStorageClassConfig(storageClassName, {
        displayName,
        description,
        ...(storageClassConfig?.isDefault === undefined && { isDefault: false }),
        ...(storageClassConfig?.isEnabled === undefined && { isEnabled: false }),
        accessModeSettings: { ...accessModeSettings, [AccessMode.RWO]: true },
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
                      Enabled access modes are available for new storage. ReadWriteOnce (RWO) is
                      always enabled and cannot be disabled.
                    </StackItem>
                  </Stack>
                }
              />
            }
            fieldId="edit-sc-access-mode"
            isStack
          >
            {showAccessModeAlert && (
              <Alert
                variant="warning"
                title="Disabling the RWX access mode will prevent new storage of this class from using
                 this access mode. Existing storage will be unaffected."
                isInline
                data-testid="edit-sc-access-mode-alert"
                className="pf-v6-u-mb-md"
              />
            )}
            {accessModeMismatch && (
              <Alert
                className="pf-v6-u-mb-md"
                variant="warning"
                isInline
                title="Unsupported access modes selected"
                data-testid="edit-sc-access-mode-mismatch-alert"
              >
                <p>
                  For the provisioner <strong>{storageClass.provisioner}</strong>, the recommended
                  access modes are:{' '}
                  {accessModeMismatch.recommended.map((m) => AccessModeLabelMap[m]).join(', ')}.
                </p>
                <p>
                  You have selected unsupported modes:{' '}
                  {accessModeMismatch.unsupported.map((m) => AccessModeLabelMap[m]).join(', ')}.
                </p>
              </Alert>
            )}
            {Object.values(AccessMode).map((modeName) => {
              const modeLabel = toAccessModeFullName(modeName);
              const checkbox = (
                <Checkbox
                  label={modeLabel}
                  description={accessModeDescriptions[modeName]}
                  // RWO is not allowed to be disabled
                  isDisabled={modeName === AccessMode.RWO}
                  // RWO is always enabled
                  isChecked={accessModeSettings[modeName] === true || modeName === AccessMode.RWO}
                  aria-label={modeLabel}
                  key={modeName}
                  id={`edit-sc-access-mode-${modeName.toLowerCase()}`}
                  data-testid={`edit-sc-access-mode-checkbox-${modeName.toLowerCase()}`}
                  onChange={(_, enabled) => {
                    if (modeName === AccessMode.RWX) {
                      if (!enabled && storageClassConfig?.accessModeSettings?.[AccessMode.RWX]) {
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

              return checkbox;
            })}
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
