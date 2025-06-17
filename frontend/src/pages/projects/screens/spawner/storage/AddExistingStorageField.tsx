import * as React from 'react';
import { Alert, FormGroup, FormHelperText, Label } from '@patternfly/react-core';
import { TypeaheadSelectOption } from '@patternfly/react-templates';
import { ExistingStorageObject } from '#~/pages/projects/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import TypeaheadSelect from '#~/components/TypeaheadSelect';
import useProjectPvcs from '#~/pages/projects/screens/detail/storage/useProjectPvcs';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { getPvcAccessMode } from '#~/pages/projects/utils.ts';

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

  const availablePvcs = React.useMemo(
    () =>
      storages.filter((pvc) => !existingStorageNames?.includes(getDisplayNameFromK8sResource(pvc))),
    [storages, existingStorageNames],
  );

  const groupSelectOptions = React.useMemo(() => {
    if (!loaded) {
      return [];
    }

    const groups: TypeaheadSelectOption[] = [];
    Object.entries(AccessMode).forEach(([label, mode]) => {
      const groupModePvc = availablePvcs.filter((pvc) => getPvcAccessMode(pvc) === mode);
      if (groupModePvc.length > 0) {
        const groupOptions = groupModePvc.map((pvc) => ({
          value: pvc.metadata.name,
          content: getDisplayNameFromK8sResource(pvc),
          description: selectDescription(
            pvc.spec.resources.requests.storage,
            pvc.metadata.annotations?.['openshift.io/description'],
          ),
          selectedLabel:
            availablePvcs.length === 1 ? (
              <Label
                key={`access-mode-label-${label}`}
                isCompact
                isDisabled
                variant="filled"
                color="grey"
                style={{ border: '1px solid var(--pf-t--global--border--color--disabled)' }}
              >
                {`${mode} (${label})`}
              </Label>
            ) : (
              <Label key={`access-mode-label-${label}`} isCompact color="blue" variant="outline">
                {`${mode} (${label})`}
              </Label>
            ),
          group: `${mode} (${label}) storage`,
        }));
        groups.push(...groupOptions);
      }
    });
    return groups;
  }, [availablePvcs, loaded]);

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
  } else if (groupSelectOptions.length === 0) {
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
        selectOptions={groupSelectOptions}
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
        isScrollable
      />
      <FormHelperText>
        <Alert
          variant="info"
          title="RWOP storage can be attached to only one workbench at a time. RWO storage can be shared by workbenches on the same node, but attaching it to a workbench on a different node will detach it from the current ones."
          isInline
          isPlain
        />
      </FormHelperText>
    </FormGroup>
  );
};

export default AddExistingStorageField;
