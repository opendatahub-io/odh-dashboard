import * as React from 'react';
import { FormGroup, FormSection, Radio, Stack, StackItem } from '@patternfly/react-core';
import { SpawnerPageSectionID } from '../types';
import { StorageData } from '../../../types';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageSection from './AddExistingStorageSection';
import { UpdateObjectAtPropAndValue } from '../../../types';

import '../../detail/storage/AddStorageModal.scss';

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
              isChecked={storageType === 'ephemeral'}
              onChange={() => setStorageData('storageType', 'ephemeral')}
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
              onChange={() => setStorageData('storageType', 'persistent')}
              body={
                storageType === 'persistent' && (
                  <Stack hasGutter>
                    <StackItem>
                      <CreateNewStorageSection
                        isChecked={creating.enabled}
                        setChecked={(checked) =>
                          setStorageData('creating', { ...creating, enabled: checked })
                        }
                        data={creating}
                        setData={(key, value) =>
                          setStorageData('creating', { ...creating, [key]: value })
                        }
                        availableSize={availableSize}
                      />
                    </StackItem>
                    <StackItem>
                      <AddExistingStorageSection
                        isChecked={existing.enabled}
                        setChecked={(checked) =>
                          setStorageData('existing', { ...existing, enabled: checked })
                        }
                        data={existing}
                        setData={(data) => setStorageData('existing', data)}
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
