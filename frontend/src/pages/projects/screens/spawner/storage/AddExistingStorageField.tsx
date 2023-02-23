import * as React from 'react';
import { ExistingStorageObject } from '~/pages/projects/types';
import ExistingPVCField from '~/pages/projects/components/ExistingPVCField';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import useAvailablePvcs from './useAvailablePvcs';

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
