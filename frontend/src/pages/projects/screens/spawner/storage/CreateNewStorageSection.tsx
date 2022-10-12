import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject } from '../../../types';
import PVSizeField from '../../../components/PVSizeField';
import ConnectWorkspaceOptionsField from './ConnectWorkspaceOptionsField';
import NameDescriptionField from '../../../components/NameDescriptionField';
import { UpdateObjectAtPropAndValue } from '../../../typeHelpers';

type CreateNewStorageSectionProps = {
  isChecked: boolean;
  setChecked: (checked: boolean) => void;
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  availableSize: number;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  isChecked,
  setChecked,
  data,
  setData,
  availableSize,
}) => {
  return (
    <Checkbox
      className="checkbox-radio-fix-body-width"
      id="create-new-storage-checkbox"
      name="create-new-storage-checkbox"
      label="Create new PV"
      isChecked={isChecked}
      onChange={setChecked}
      body={
        isChecked && (
          <Stack hasGutter>
            <StackItem>
              <NameDescriptionField
                nameFieldId="create-new-storage-name"
                descriptionFieldId="create-new-storage-description"
                data={data.nameDesc}
                setData={(newData) => setData('nameDesc', newData)}
              />
            </StackItem>
            <StackItem>
              <ConnectWorkspaceOptionsField
                fieldId="connection-options-radio-group"
                allWorkspaces={[]}
                setSelections={(selections) => setData('workspaceSelections', selections)}
              />
            </StackItem>
            <StackItem>
              <PVSizeField
                fieldID="create-new-storage-size"
                availableSize={availableSize}
                size={data.size}
                setSize={(size: number) => setData('size', size)}
              />
            </StackItem>
          </Stack>
        )
      }
    />
  );
};

export default CreateNewStorageSection;
