import * as React from 'react';
import { FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import { StorageData, StorageType, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { getDashboardMainContainer } from '~/utilities/utils';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageField from './AddExistingStorageField';

type StorageFieldType = {
  storageData: StorageData;
  setStorageData: UpdateObjectAtPropAndValue<StorageData>;
  editStorage: string;
};

const StorageField: React.FC<StorageFieldType> = ({ storageData, setStorageData, editStorage }) => {
  const { storageType, creating, existing } = storageData;

  return (
    <FormGroup fieldId="cluster-storage" role="radiogroup">
      <Stack hasGutter>
        <StackItem>
          <Radio
            name="persistent-new-storage-type-radio"
            data-testid="persistent-new-storage-type-radio"
            id="persistent-new-storage-type-radio"
            label="Create new persistent storage"
            description="This creates storage that is retained when logged out."
            isChecked={storageType === StorageType.NEW_PVC}
            onChange={() => setStorageData('storageType', StorageType.NEW_PVC)}
            body={
              storageType === StorageType.NEW_PVC && (
                <CreateNewStorageSection
                  menuAppendTo={getDashboardMainContainer()}
                  data={creating}
                  setData={(key, value) =>
                    setStorageData('creating', { ...creating, [key]: value })
                  }
                />
              )
            }
          />
        </StackItem>
        <StackItem>
          <Radio
            name="persistent-existing-storage-type-radio"
            data-testid="persistent-existing-storage-type-radio"
            id="persistent-existing-storage-type-radio"
            label="Use existing persistent storage"
            description="This reuses a previously created persistent storage."
            isChecked={storageType === StorageType.EXISTING_PVC}
            onChange={() => setStorageData('storageType', StorageType.EXISTING_PVC)}
            body={
              storageType === StorageType.EXISTING_PVC && (
                <AddExistingStorageField
                  data={existing}
                  setData={(data) => setStorageData('existing', data)}
                  editStorage={editStorage}
                  selectDirection="up"
                  menuAppendTo={getDashboardMainContainer()}
                />
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default StorageField;
