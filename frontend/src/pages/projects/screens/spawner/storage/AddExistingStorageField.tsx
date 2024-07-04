import * as React from 'react';
import { TypeaheadSelect } from '@patternfly/react-templates';
import { Alert, FormGroup } from '@patternfly/react-core';
import { ExistingStorageObject } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import useAvailablePvcs from './useAvailablePvcs';

type AddExistingStorageFieldProps = {
  data: ExistingStorageObject;
  setData: (data: ExistingStorageObject) => void;
  editStorage?: string;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement;
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
  const [storages, loaded, loadError] = useAvailablePvcs(
    currentProject.metadata.name,
    allNotebooks,
    editStorage,
  );

  if (loadError) {
    return (
      <Alert title="Error loading pvcs" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  let placeholderText: string;

  if (!loaded) {
    placeholderText = 'Loading storages...';
  } else if (storages.length === 0) {
    placeholderText = 'No existing storages available';
  } else {
    placeholderText = 'Select a persistent storage';
  }

  return (
    <FormGroup
      isRequired
      label="Persistent storage"
      fieldId="add-existing-storage-pv-selection"
      data-testid="persistent-storage-group"
    >
      <TypeaheadSelect
        initialOptions={
          loaded
            ? storages.map((pvc) => ({
                value: pvc.metadata.name,
                content: getDisplayNameFromK8sResource(pvc),
                selected: pvc.metadata.name === data.storage,
              }))
            : []
        }
        onSelect={(_ev, storage) => setData({ ...data, storage: String(storage) || '' })}
        placeholder={placeholderText}
        noOptionsFoundMessage={(filter) => `No persistent storage was found for "${filter}"`}
        popperProps={{ direction: selectDirection, appendTo: menuAppendTo }}
        isDisabled={!loaded || storages.length === 0}
      />
    </FormGroup>
  );
};

export default AddExistingStorageField;
