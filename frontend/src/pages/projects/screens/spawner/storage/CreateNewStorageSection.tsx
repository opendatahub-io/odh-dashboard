import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import StorageClassSelect from './StorageClassSelect';

type CreateNewStorageSectionProps = {
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  currentSize?: string;
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement;
  disableStorageClassSelect?: boolean;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  data,
  setData,
  currentSize,
  menuAppendTo,
  autoFocusName,
  disableStorageClassSelect,
}) => {
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
          currentSize={currentSize}
          size={data.size}
          setSize={(size) => setData('size', size)}
        />
      </StackItem>
    </Stack>
  );
};

export default CreateNewStorageSection;
