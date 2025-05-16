import * as React from 'react';
import {
  Form,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import CreateNewStorageSection from '~/pages/projects/screens/spawner/storage/CreateNewStorageSection';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import useAdminDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useAdminDefaultStorageClass';
import { useCreateStorageObject } from '~/pages/projects/screens/spawner/storage/utils';
import { StorageData } from '~/pages/projects/types';

type CreateStorageObjectData = Pick<
  StorageData,
  'name' | 'description' | 'size' | 'storageClassName'
>;

export type BaseStorageModalProps = {
  submitLabel?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  isValid: boolean;
  onSubmit: (data: CreateStorageObjectData) => Promise<void>;
  hasDuplicateName?: boolean;
  onNameChange?: (value: string) => void;
  existingData?: CreateStorageObjectData;
  existingPvc?: PersistentVolumeClaimKind;
  onClose: (submitted: boolean) => void;
};

const BaseStorageModal: React.FC<BaseStorageModalProps> = ({
  existingPvc,
  existingData,
  onSubmit,
  submitLabel = 'Add storage',
  title = 'Add cluster storage',
  description = 'Add storage and optionally connect it with an existing workbench.',
  children,
  isValid,
  hasDuplicateName,
  onClose,
  onNameChange,
}) => {
  const [createData, setCreateData] = useCreateStorageObject(existingPvc, existingData);
  const [nameDescValid, setNameDescValid] = React.useState<boolean>();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const [defaultStorageClass] = useAdminDefaultStorageClass();
  const [error, setError] = React.useState<Error | undefined>();
  const [actionInProgress, setActionInProgress] = React.useState(false);

  React.useEffect(() => {
    if (!existingPvc) {
      if (isStorageClassesAvailable) {
        setCreateData('storageClassName', defaultStorageClass?.metadata.name);
      } else {
        setCreateData('storageClassName', preferredStorageClass?.metadata.name);
      }
    }
  }, [
    isStorageClassesAvailable,
    defaultStorageClass,
    preferredStorageClass,
    existingPvc,
    setCreateData,
  ]);

  const canCreate = !actionInProgress && nameDescValid && isValid;

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    onSubmit(createData)
      .then(() => onClose(true))
      .catch((err) => {
        setError(err);
        setActionInProgress(false);
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={() => onClose(false)}>
      <ModalHeader title={title} description={description} />
      <ModalBody>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Stack hasGutter>
            <StackItem>
              <CreateNewStorageSection
                data={createData}
                setData={setCreateData}
                currentStatus={existingPvc?.status}
                autoFocusName
                onNameChange={onNameChange}
                setValid={setNameDescValid}
                hasDuplicateName={hasDuplicateName}
                disableStorageClassSelect={!!existingPvc}
                editableK8sName={!existingPvc}
              />
            </StackItem>
            {children}
          </Stack>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={submitLabel}
          onSubmit={submit}
          onCancel={() => onClose(false)}
          isSubmitDisabled={!canCreate}
          error={error}
          alertTitle="Error creating storage"
        />
      </ModalFooter>
    </Modal>
  );
};

export default BaseStorageModal;
