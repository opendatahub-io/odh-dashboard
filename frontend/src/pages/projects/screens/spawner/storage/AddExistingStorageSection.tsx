import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { ExistingStorageObject } from '../../../types';
import ExistingProjectField from '../../../components/ExistingProjectField';
import ExistingPVCField from '../../../components/ExistingPVCField';
import { getDashboardMainContainer } from '../../../../../utilities/utils';
import useAvailablePvcs from './useAvailablePvcs';

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
    <Checkbox
      className="checkbox-radio-fix-body-width"
      id="add-existing-storage-checkbox"
      name="add-existing-storage-checkbox"
      label="Add existing PV"
      isChecked={isChecked}
      onChange={setChecked}
      body={
        isChecked && (
          <Stack hasGutter>
            <StackItem>
              <ExistingProjectField
                fieldId="add-existing-storage-project-selection"
                selectedProject={data.project}
                onSelect={onProjectSelect}
                selectDirection="up"
                menuAppendTo={getDashboardMainContainer()}
              />
            </StackItem>
            <StackItem>
              <ExistingPVCField
                fieldId="add-existing-storage-pv-selection"
                storages={pvcs}
                loaded={loaded}
                loadError={loadError}
                selectedStorage={data.storage}
                setStorage={(storage) => setData({ ...data, storage })}
                selectDirection="up"
                menuAppendTo={getDashboardMainContainer()}
              />
            </StackItem>
          </Stack>
        )
      }
    />
  );
};

export default AddExistingStorageSection;
