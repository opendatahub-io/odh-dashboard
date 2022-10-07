import * as React from 'react';
import { Form, Radio } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '../../types';
import PVSizeField from '../../components/PVSizeField';
import NewStorageNameDescFields from '../../components/NewStorageNameDescFields';
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
    <Radio
      className="checkbox-radio-fix-body-width-50"
      id="create-new-storage-radio"
      name="create-new-storage-radio"
      label="Create new PV"
      isChecked={isChecked}
      onChange={setChecked}
      body={
        isChecked && (
          <Form>
            <NewStorageNameDescFields
              nameFieldId="create-new-storage-name"
              descriptionFieldId="create-new-storage-description"
              name={creatingObject.name}
              description={creatingObject.description}
              setName={(name) => setCreatingObject('name', name)}
              setDescription={(description) => setCreatingObject('description', description)}
            />
            <ConnectWorkspaceOptionsField
              fieldId="connection-options-radio-group"
              allWorkspaces={[]}
              selections={creatingObject.workspaceSelections}
              setSelections={(selections) => setCreatingObject('workspaceSelections', selections)}
            />
            <PVSizeField
              fieldID="create-new-storage-size"
              availableSize={availableSize}
              size={creatingObject.size}
              setSize={(size: number) => setCreatingObject('size', size)}
            />
          </Form>
        )
      }
    />
  );
};

export default CreateNewStorageSection;
