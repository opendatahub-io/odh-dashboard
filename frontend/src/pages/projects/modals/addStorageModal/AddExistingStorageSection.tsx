import * as React from 'react';
import { Form, Radio } from '@patternfly/react-core';
import { ExistingStorageObject, UpdateObjectAtPropAndValue } from '../../types';
import ExistingStorageProjectField from '../../components/ExistingStorageProjectField';
import ExistingStoragePVField from '../../components/ExistingStoragePVField';

type AddExistingStorageSectionProps = {
  isChecked: boolean;
  setChecked: (checked: boolean) => void;
  existingObject: ExistingStorageObject;
  setExistingObject: UpdateObjectAtPropAndValue<ExistingStorageObject>;
};

const AddExistingStorageSection: React.FC<AddExistingStorageSectionProps> = ({
  isChecked,
  setChecked,
  existingObject,
  setExistingObject,
}) => {
  const [selectOpen, setSelectOpen] = React.useState<'project' | 'storage' | null>(null);

  return (
    <Radio
      className="checkbox-radio-fix-body-width-50"
      id="add-existing-storage-radio"
      name="add-existing-storage-radio"
      label="Add existing PV"
      isChecked={isChecked}
      onChange={setChecked}
      body={
        isChecked && (
          <Form>
            <ExistingStorageProjectField
              options={[]}
              fieldId="add-existing-storage-project-selection"
              project={existingObject.project}
              isOpen={selectOpen === 'project'}
              setProject={(project) => setExistingObject('project', project)}
              setStorage={(storage) => setExistingObject('storage', storage)}
              setOpen={(isOpen) => setSelectOpen(isOpen ? 'project' : null)}
            />
            <ExistingStoragePVField
              options={[]}
              fieldId="add-existing-storage-pv-selection"
              storage={existingObject.storage}
              isOpen={selectOpen === 'storage'}
              setStorage={(storage) => setExistingObject('storage', storage)}
              setOpen={(isOpen) => setSelectOpen(isOpen ? 'storage' : null)}
              storageLoading={false}
            />
          </Form>
        )
      }
    />
  );
};

export default AddExistingStorageSection;
