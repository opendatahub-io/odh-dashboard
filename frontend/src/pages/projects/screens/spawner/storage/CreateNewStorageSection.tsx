import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject } from '../../../types';
import PVSizeField from '../../../components/PVSizeField';
import NameDescriptionField from '../../../components/NameDescriptionField';
import { UpdateObjectAtPropAndValue } from '../../../types';

type CreateNewStorageSectionProps = {
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  disableSize?: boolean;
  autoFocusName?: boolean;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  data,
  setData,
  disableSize,
  autoFocusName,
}) => {
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
        <PVSizeField
          fieldID="create-new-storage-size"
          disable={disableSize}
          size={data.size}
          setSize={(size) => setData('size', size)}
        />
      </StackItem>
    </Stack>
  );
};

export default CreateNewStorageSection;
