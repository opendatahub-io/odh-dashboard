import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { StorageData, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import StorageClassSelect from './StorageClassSelect';

type CreateNewStorageSectionProps<D extends StorageData> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  currentStatus?: PersistentVolumeClaimKind['status'];
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement;
  disableStorageClassSelect?: boolean;
  onNameChange?: (value: string) => void;
  hasDuplicateName?: boolean;
};

const CreateNewStorageSection = <D extends StorageData>({
  data,
  setData,
  currentStatus,
  menuAppendTo,
  autoFocusName,
  disableStorageClassSelect,
  onNameChange,
  hasDuplicateName,
}: CreateNewStorageSectionProps<D>): React.ReactNode => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;

  return (
    <Stack hasGutter>
      <StackItem>
        <NameDescriptionField
          nameFieldId="create-new-storage-name"
          descriptionFieldId="create-new-storage-description"
          data={{ name: data.name, description: data.description || '' }}
          setData={(newData) => {
            setData('name', newData.name);
            setData('description', newData.description);
          }}
          onNameChange={onNameChange}
          hasNameError={hasDuplicateName}
          nameHelperText={
            hasDuplicateName ? <DuplicateNameHelperText isError name={data.name} /> : undefined
          }
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
          size={String(data.size)}
          setSize={(size) => setData('size', size)}
        />
      </StackItem>
    </Stack>
  );
};

export default CreateNewStorageSection;
