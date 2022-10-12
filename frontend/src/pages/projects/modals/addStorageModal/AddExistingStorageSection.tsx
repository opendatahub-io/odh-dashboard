import * as React from 'react';
import { Form, Radio } from '@patternfly/react-core';
import { ExistingStorageObject } from '../../types';
import ExistingProjectField from '../../components/ExistingProjectField';
import ExistingPVCField from '../../components/ExistingPVCField';
import useAvailablePvcs from '../../screens/spawner/storage/useAvailablePvcs';

type AddExistingStorageSectionProps = {
  isChecked: boolean;
  setChecked: (checked: boolean) => void;
  data: ExistingStorageObject;
  setData: (data: ExistingStorageObject) => void;
};

const AddExistingStorageSection: React.FC<AddExistingStorageSectionProps> = ({
  isChecked,
  setChecked,
  data,
  setData,
}) => {
  const [pvcs, loaded, loadError, fetchPvcs] = useAvailablePvcs();

  const onProjectSelect = (selection?: string) => {
    setData({ ...data, project: selection, storage: undefined });
    fetchPvcs(selection);
  };

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
            <ExistingProjectField
              fieldId="add-existing-storage-project-selection"
              selectedProject={data.project}
              onSelect={onProjectSelect}
            />
            <ExistingPVCField
              fieldId="add-existing-storage-pv-selection"
              storages={pvcs}
              loaded={loaded}
              loadError={loadError}
              selectedStorage={data.storage}
              setStorage={(storage) => setData({ ...data, storage })}
            />
          </Form>
        )
      }
    />
  );
};

export default AddExistingStorageSection;
