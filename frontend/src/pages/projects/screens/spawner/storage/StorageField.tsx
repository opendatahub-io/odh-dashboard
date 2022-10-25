import * as React from 'react';
import { FormGroup, FormSection, Radio, Stack, StackItem } from '@patternfly/react-core';
import { SpawnerPageSectionID } from '../types';
import { StorageData, StorageType, UpdateObjectAtPropAndValue } from '../../../types';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageField from './AddExistingStorageField';

import '../../detail/storage/ManageStorageModal.scss';
import { getDashboardMainContainer } from '../../../../../utilities/utils';

type StorageFieldType = {
  storageData: StorageData;
  setStorageData: UpdateObjectAtPropAndValue<StorageData>;
  availableSize: number;
};

const StorageField: React.FC<StorageFieldType> = ({
  storageData,
  setStorageData,
  availableSize,
}) => {
  const { storageType, creating, existing } = storageData;

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
              isChecked={storageType === StorageType.EPHEMERAL}
              onChange={() => setStorageData('storageType', StorageType.EPHEMERAL)}
            />
          </StackItem>
          <StackItem>
            <Radio
              className="checkbox-radio-fix-body-width"
              name="persistent-new-storage-type-radio"
              id="persistent-new-storage-type-radio"
              label="Create a new persistent storage"
              description="This creates a storage that is retained when logged out."
              isChecked={storageType === StorageType.NEW_PVC}
              onChange={() => setStorageData('storageType', StorageType.NEW_PVC)}
              body={
                storageType === StorageType.NEW_PVC && (
                  <CreateNewStorageSection
                    data={creating}
                    setData={(key, value) =>
                      setStorageData('creating', { ...creating, [key]: value })
                    }
                    availableSize={availableSize}
                  />
                )
              }
            />
          </StackItem>
          <StackItem>
            <Radio
              className="checkbox-radio-fix-body-width"
              name="persistent-existing-storage-type-radio"
              id="persistent-existing-storage-type-radio"
              label="Use an existing persistent storage"
              description="This reuses a previously created persistent storage."
              isChecked={storageType === StorageType.EXISTING_PVC}
              onChange={() => setStorageData('storageType', StorageType.EXISTING_PVC)}
              body={
                storageType === StorageType.EXISTING_PVC && (
                  <AddExistingStorageField
                    data={existing}
                    setData={(data) => setStorageData('existing', data)}
                    selectDirection="up"
                    menuAppendTo={getDashboardMainContainer()}
                  />
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
