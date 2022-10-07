import * as React from 'react';
import { FormGroup, FormSection, Radio, Stack, StackItem } from '@patternfly/react-core';
import { SpawnerPageSectionID } from '../types';
import {
  CreatingStorageObject,
  ExistingStorageObject,
  ToggleValueInSet,
  UpdateObjectAtPropAndValue,
} from '../../../types';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageSection from './AddExistingStorageSection';
import { ProjectKind } from '../../../../../k8sTypes';

import '../../../modals/addStorageModal/addStorageModal.scss';

type StorageFieldType = {
  projects: ProjectKind[];
  storageType: 'ephemeral' | 'persistent';
  setStorageType: (type: 'ephemeral' | 'persistent') => void;
  storageBindingType: Set<'new' | 'existing'>;
  setStorageBindingType: ToggleValueInSet<'new' | 'existing'>;
  creatingObject: CreatingStorageObject;
  setCreatingObject: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  existingObject: ExistingStorageObject;
  setExistingObject: UpdateObjectAtPropAndValue<ExistingStorageObject>;
  availableSize: number;
};

const StorageField: React.FC<StorageFieldType> = ({
  projects,
  storageType,
  setStorageType,
  storageBindingType,
  setStorageBindingType,
  creatingObject,
  setCreatingObject,
  existingObject,
  setExistingObject,
  availableSize,
}) => {
  return (
    <FormSection title="Storage" id={SpawnerPageSectionID.STORAGE}>
      <FormGroup fieldId="storage" role="radiogroup">
        <Stack hasGutter>
          <StackItem>
            <Radio
              name="ephemeral-storage-type-radio"
              id="ephemeral-storage-type-radio"
              label="Ephemeral storage"
              description="This is temporary storage that is cleared when logged out."
              isChecked={storageType === 'ephemeral'}
              onChange={() => setStorageType('ephemeral')}
            />
          </StackItem>
          <StackItem>
            <Radio
              className="checkbox-radio-fix-body-width"
              name="persistent-storage-type-radio"
              id="persistent-storage-type-radio"
              label="Persistent storage"
              description="This is storage that is retained when logged out."
              isChecked={storageType === 'persistent'}
              onChange={() => setStorageType('persistent')}
              body={
                storageType === 'persistent' && (
                  <Stack hasGutter>
                    <StackItem>
                      <CreateNewStorageSection
                        isChecked={storageBindingType.has('new')}
                        setChecked={(checked) => setStorageBindingType('new', checked)}
                        creatingObject={creatingObject}
                        setCreatingObject={setCreatingObject}
                        availableSize={availableSize}
                      />
                    </StackItem>
                    <StackItem>
                      <AddExistingStorageSection
                        isChecked={storageBindingType.has('existing')}
                        setChecked={(checked) => setStorageBindingType('existing', checked)}
                        existingObject={existingObject}
                        setExistingObject={setExistingObject}
                        projects={projects}
                      />
                    </StackItem>
                  </Stack>
                )
              }
            />
          </StackItem>
        </Stack>
      </FormGroup>
    </FormSection>
  );
};

export default StorageField;
