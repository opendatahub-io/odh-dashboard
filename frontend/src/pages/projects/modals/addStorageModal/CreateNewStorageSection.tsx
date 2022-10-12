import * as React from 'react';
import { Form, Radio } from '@patternfly/react-core';
import { CreatingStorageObject } from '../../types';
import PVSizeField from '../../components/PVSizeField';
import NameDescriptionField from '../../components/NameDescriptionField';
import ConnectWorkspaceOptionsField from './ConnectWorkspaceOptionsField';
import { UpdateObjectAtPropAndValue } from '../../typeHelpers';

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
            <NameDescriptionField
              nameFieldId="create-new-storage-name"
              descriptionFieldId="create-new-storage-description"
              data={data.nameDesc}
              setData={(newData) => setData('nameDesc', newData)}
            />
            <ConnectWorkspaceOptionsField
              fieldId="connection-options-radio-group"
              allWorkspaces={[]}
              selections={data.workspaceSelections}
              setSelections={(selections) => setData('workspaceSelections', selections)}
            />
            <PVSizeField
              fieldID="create-new-storage-size"
              availableSize={availableSize}
              size={data.size}
              setSize={(size: number) => setData('size', size)}
            />
          </Form>
        )
      }
    />
  );
};

export default CreateNewStorageSection;
