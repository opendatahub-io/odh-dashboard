import * as React from 'react';
import { ExistingStorageObject } from '../../../types';
import ExistingPVCField from '../../../components/ExistingPVCField';
import useAvailablePvcs from './useAvailablePvcs';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

type AddExistingStorageFieldProps = {
  data: ExistingStorageObject;
  setData: (data: ExistingStorageObject) => void;
  excludePVCNames?: string[];
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement | 'parent';
};

const AddExistingStorageField: React.FC<AddExistingStorageFieldProps> = ({
  data,
  setData,
  excludePVCNames,
  selectDirection,
  menuAppendTo,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [pvcs, loaded, loadError] = useAvailablePvcs(currentProject.metadata.name);

  return (
    <ExistingPVCField
      fieldId="add-existing-storage-pv-selection"
      storages={
        excludePVCNames ? pvcs.filter((pvc) => !excludePVCNames.includes(pvc.metadata.name)) : pvcs
      }
      loaded={loaded}
      loadError={loadError}
      selectedStorage={data.storage}
      setStorage={(storage) => setData({ ...data, storage: storage || '' })}
      selectDirection={selectDirection}
      menuAppendTo={menuAppendTo}
    />
  );
};

export default AddExistingStorageField;
