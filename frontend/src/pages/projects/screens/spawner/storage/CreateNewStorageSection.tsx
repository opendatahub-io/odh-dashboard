import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import StorageClassSelect from './StorageClassSelect';

type CreateNewStorageSectionProps<D extends CreatingStorageObject> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  currentStatus?: PersistentVolumeClaimKind['status'];
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement;
  disableStorageClassSelect?: boolean;
};

const CreateNewStorageSection = <D extends CreatingStorageObject>({
  data,
  setData,
  currentStatus,
  menuAppendTo,
  autoFocusName,
  disableStorageClassSelect,
}: CreateNewStorageSectionProps<D>): React.ReactNode => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;

  return (
    <Stack hasGutter>
      <StackItem>
        <NameDescriptionField
          nameFieldId="create-new-storage-name"
          descriptionFieldId="create-new-storage-description"
          data={data.nameDesc}
          setData={(newData) => setData('nameDesc', newData)}
          autoFocusName={autoFocusName}
        />
      </StackItem>
      <StackItem>
        {isStorageClassesAvailable && (
          <StorageClassSelect
            storageClassName={data.storageClassName}
            setStorageClassName={(name) => setData('storageClassName', name)}
            disableStorageClassSelect={disableStorageClassSelect}
            menuAppendTo={menuAppendTo}
          />
        )}
      </StackItem>
      <StackItem>
        <PVSizeField
          menuAppendTo={menuAppendTo}
          fieldID="create-new-storage-size"
          currentStatus={currentStatus}
          size={data.size}
          setSize={(size) => setData('size', size)}
        />
      </StackItem>
    </Stack>
  );
};

export default CreateNewStorageSection;
