import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';

type CreateNewStorageSectionProps = {
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  currentSize?: string;
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  data,
  setData,
  currentSize,
  menuAppendTo,
  autoFocusName,
}) => (
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

export default CreateNewStorageSection;
