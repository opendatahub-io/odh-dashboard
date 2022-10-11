import * as React from 'react';
import { Checkbox, SelectOption, Stack, StackItem } from '@patternfly/react-core';
import { ExistingStorageObject, UpdateObjectAtPropAndValue } from '../../../types';
import ExistingStorageProjectField from '../../../components/ExistingStorageProjectField';
import ExistingStoragePVField from '../../../components/ExistingStoragePVField';
import { getAvailablePvcs } from '../../../../../api';
import { getProjectDisplayName, getPvcDisplayName } from '../../../utils';
import { ProjectKind } from '../../../../../k8sTypes';

type AddExistingStorageSectionProps = {
  projects: ProjectKind[];
  isChecked: boolean;
  setChecked: (checked: boolean) => void;
  existingObject: ExistingStorageObject;
  setExistingObject: UpdateObjectAtPropAndValue<ExistingStorageObject>;
};

const AddExistingStorageSection: React.FC<AddExistingStorageSectionProps> = ({
  projects,
  isChecked,
  setChecked,
  existingObject,
  setExistingObject,
}) => {
  const [selectOpen, setSelectOpen] = React.useState<'project' | 'storage' | null>(null);
  const [storageLoading, setStorageLoading] = React.useState(false);

  const projectOptions = React.useMemo(
    () =>
      projects.map((project) => (
        <SelectOption key={project.metadata.name} value={project.metadata.name}>
          {getProjectDisplayName(project)}
        </SelectOption>
      )),
    [projects],
  );

  const storageOptions = React.useMemo(() => {
    if (existingObject.project) {
      setStorageLoading(true);
      getAvailablePvcs(existingObject.project)
        .then((pvcs) => {
          setStorageLoading(false);
          return pvcs.map((pvc) => (
            <SelectOption key={pvc.metadata.name} value={pvc.metadata.name}>
              {getPvcDisplayName(pvc)}
            </SelectOption>
          ));
        })
        .catch((e) => {
          console.error(e);
          setStorageLoading(false);
          return [];
        });
    }
    return [];
  }, [existingObject.project]);

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
              <ExistingStorageProjectField
                fieldId="add-existing-storage-project-selection"
                project={existingObject.project}
                isOpen={selectOpen === 'project'}
                setProject={(project) => setExistingObject('project', project)}
                setStorage={(storage) => setExistingObject('storage', storage)}
                setOpen={(isOpen) => setSelectOpen(isOpen ? 'project' : null)}
                selectDirection="up"
                options={projectOptions}
              />
            </StackItem>
            <StackItem>
              <ExistingStoragePVField
                fieldId="add-existing-storage-pv-selection"
                storage={existingObject.storage}
                isOpen={selectOpen === 'storage'}
                setStorage={(storage) => setExistingObject('storage', storage)}
                setOpen={(isOpen) => setSelectOpen(isOpen ? 'storage' : null)}
                selectDirection="up"
                options={storageOptions}
                storageLoading={storageLoading}
              />
            </StackItem>
          </Stack>
        )
      }
    />
  );
};

export default AddExistingStorageSection;
