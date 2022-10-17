import * as React from 'react';
import { Checkbox, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject } from '../../../types';
import PVSizeField from '../../../components/PVSizeField';
import NameDescriptionField from '../../../components/NameDescriptionField';
import { UpdateObjectAtPropAndValue } from '../../../types';

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
              <FormGroup fieldId="connect-to-current-workspace-checkbox">
                <Checkbox
                  id="connect-to-current-workspace-checkbox"
                  name="connect-to-current-workspace-checkbox"
                  label="Connect to this workspace"
                  isChecked
                  isDisabled
                />
              </FormGroup>
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
