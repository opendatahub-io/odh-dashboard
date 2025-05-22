import * as React from 'react';
import { Alert, FormGroup } from '@patternfly/react-core';
import { ExistingStorageObject } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';
import useProjectPvcs from '~/pages/projects/screens/detail/storage/useProjectPvcs';

type AddExistingStorageFieldProps = {
  data: ExistingStorageObject;
  setData: (data: ExistingStorageObject) => void;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement;
  existingStorageNames?: string[];
};

const AddExistingStorageField: React.FC<AddExistingStorageFieldProps> = ({
  data,
  setData,
  selectDirection,
  menuAppendTo,
  existingStorageNames,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { data: storages, loaded, error } = useProjectPvcs(currentProject.metadata.name);

  const selectDescription = (size: string, description?: string) => (
    <div>
      <div>Size: {size}</div>
      {description && <div>Description: {description}</div>}
    </div>
  );

  const selectOptions = React.useMemo(
    () =>
      loaded
        ? storages.reduce((acc: TypeaheadSelectOption[], pvc) => {
            if (!existingStorageNames?.includes(getDisplayNameFromK8sResource(pvc))) {
              acc.push({
                value: pvc.metadata.name,
                content: getDisplayNameFromK8sResource(pvc),
                description: selectDescription(
                  pvc.spec.resources.requests.storage,
                  pvc.metadata.annotations?.['openshift.io/description'],
                ),
              });
            }

            return acc;
          }, [])
        : [],
    [existingStorageNames, loaded, storages],
  );

  if (error) {
    return (
      <Alert title="Error loading pvcs" variant="danger">
        {error.message}
      </Alert>
    );
  }

  let placeholderText: string;

  if (!loaded) {
    placeholderText = 'Loading storages';
  } else if (selectOptions.length === 0) {
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
        selectOptions={selectOptions}
        selected={data.storage}
        onSelect={(_, storage) => {
          const pvc = storages.find((pvcData) => pvcData.metadata.name === storage);
          setData({
            ...data,
            pvc,
            storage: String(storage) || '',
          });
        }}
        placeholder={placeholderText}
        noOptionsFoundMessage={(filter) => `No persistent storage was found for "${filter}"`}
        popperProps={{ direction: selectDirection, appendTo: menuAppendTo }}
        isDisabled={!loaded}
        data-testid="persistent-storage-typeahead"
      />
    </FormGroup>
  );
};

export default AddExistingStorageField;
