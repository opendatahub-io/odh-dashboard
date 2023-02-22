import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/pages/projects/components/NameDescriptionField';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';

type CreateNewStorageSectionProps = {
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  currentSize?: string;
  autoFocusName?: boolean;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  data,
  setData,
  currentSize,
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
        fieldID="create-new-storage-size"
        currentSize={currentSize}
        size={data.size}
        setSize={(size) => setData('size', size)}
      />
    </StackItem>
  </Stack>
);

export default CreateNewStorageSection;
