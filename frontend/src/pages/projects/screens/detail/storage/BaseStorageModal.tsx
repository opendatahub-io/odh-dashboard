import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import CreateNewStorageSection from '~/pages/projects/screens/spawner/storage/CreateNewStorageSection';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import useDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { useCreateStorageObject } from '~/pages/projects/screens/spawner/storage/utils';
import { CreatingStorageObject } from '~/pages/projects/types';

export type BaseStorageModalProps = {
  submitLabel?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  isValid: boolean;
  onSubmit: (data: CreatingStorageObject) => Promise<void>;
  existingData?: PersistentVolumeClaimKind;
  onClose: (submitted: boolean) => void;
};

const BaseStorageModal: React.FC<BaseStorageModalProps> = ({
  existingData,
  onSubmit,
  submitLabel = 'Add storage',
  title = 'Add cluster storage',
  description = 'Add storage and optionally connect it with an existing workbench.',
  children,
  isValid,
  onClose,
}) => {
  const [createData, setCreateData, resetData] = useCreateStorageObject(existingData);
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const [defaultStorageClass] = useDefaultStorageClass();
  const [error, setError] = React.useState<Error | undefined>();
  const [actionInProgress, setActionInProgress] = React.useState(false);
  React.useEffect(() => {
    if (!existingData) {
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
    existingData,
    setCreateData,
  ]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetData();
  };

  const canCreate = !actionInProgress && createData.nameDesc.name.trim().length > 0 && isValid;

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    onSubmit(createData)
      .then(() => onBeforeClose(true))
      .catch((err) => {
        setError(err);
        setActionInProgress(false);
      });
  };

  return (
    <Modal
      title={title}
      description={description}
      variant="medium"
      isOpen
      onClose={() => onBeforeClose(false)}
      showClose
      footer={
        <DashboardModalFooter
          submitLabel={submitLabel}
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={!canCreate}
          error={error}
          alertTitle="Error creating storage"
        />
      }
    >
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
              currentSize={existingData?.status?.capacity?.storage}
              autoFocusName
              disableStorageClassSelect={!!existingData}
            />
          </StackItem>
          {children}
        </Stack>
      </Form>
    </Modal>
  );
};

export default BaseStorageModal;
