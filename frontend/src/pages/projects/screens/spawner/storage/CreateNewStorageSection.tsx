import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '../../../types';
import NewStorageNameDescFields from '../../../components/NewStorageNameDescFields';
import PVSizeField from '../../../components/PVSizeField';
import ConnectWorkspaceOptionsField from './ConnectWorkspaceOptionsField';

type CreateNewStorageSectionProps = {
  isChecked: boolean;
  setChecked: (checked: boolean) => void;
  creatingObject: CreatingStorageObject;
  setCreatingObject: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  availableSize: number;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  isChecked,
  setChecked,
  creatingObject,
  setCreatingObject,
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
              <NewStorageNameDescFields
                nameFieldId="create-new-storage-name"
                descriptionFieldId="create-new-storage-description"
                name={creatingObject.name}
                description={creatingObject.description}
                setName={(name) => setCreatingObject('name', name)}
                setDescription={(description) => setCreatingObject('description', description)}
              />
            </StackItem>
            <StackItem>
              <ConnectWorkspaceOptionsField
                fieldId="connection-options-radio-group"
                allWorkspaces={[]}
                setSelections={(selections) => setCreatingObject('workspaceSelections', selections)}
              />
            </StackItem>
            <StackItem>
              <PVSizeField
                fieldID="create-new-storage-size"
                availableSize={availableSize}
                size={creatingObject.size}
                setSize={(size: number) => setCreatingObject('size', size)}
              />
            </StackItem>
          </Stack>
        )
      }
    />
  );
};

export default CreateNewStorageSection;
