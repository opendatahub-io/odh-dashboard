import * as React from 'react';
import { ExistingStorageObject } from '../../../types';
import ExistingPVCField from '../../../components/ExistingPVCField';
import useAvailablePvcs from './useAvailablePvcs';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

type AddExistingStorageFieldProps = {
  data: ExistingStorageObject;
  setData: (data: ExistingStorageObject) => void;
  editStorage?: string;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement | 'parent';
};

const AddExistingStorageField: React.FC<AddExistingStorageFieldProps> = ({
  data,
  setData,
  editStorage,
  selectDirection,
  menuAppendTo,
}) => {
  const {
    currentProject,
    notebooks: { data: allNotebooks },
  } = React.useContext(ProjectDetailsContext);
  const [pvcs, loaded, loadError] = useAvailablePvcs(
    currentProject.metadata.name,
    allNotebooks,
    editStorage,
  );

  return (
    <ExistingPVCField
      fieldId="add-existing-storage-pv-selection"
      storages={pvcs}
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
