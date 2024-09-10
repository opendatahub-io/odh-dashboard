import * as React from 'react';
import { FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { CreatingStorageObject, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import SimpleSelect from '~/components/SimpleSelect';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { getStorageClassConfig } from '~/pages/storageClasses/utils';

type CreateNewStorageSectionProps = {
  data: CreatingStorageObject;
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>;
  currentSize?: string;
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement;
  isEdit?: boolean;
};

const CreateNewStorageSection: React.FC<CreateNewStorageSectionProps> = ({
  data,
  setData,
  currentSize,
  menuAppendTo,
  autoFocusName,
  isEdit,
}) => {
  const [storageClasses, storageClassesLoaded] = useStorageClasses();

  return (
    <Stack hasGutter>
      <StackItem>
        <NameDescriptionField
          nameFieldId="create-new-storage-name"
          descriptionFieldId="create-new-storage-description"
          data={data.nameDesc}
          setData={(newData) => setData('nameDesc', newData)}
          autoFocusName={autoFocusName}
        />
      </StackItem>
      <StackItem>
        <FormGroup label="Storage class" fieldId="storage-class" isRequired>
          <SimpleSelect
            id="storage-classes-selector"
            isFullWidth
            value={data.storageClassName}
            options={storageClasses.map((sc) => {
              const { name } = sc.metadata;
              const desc = getStorageClassConfig(sc)?.description;
              return { key: name, label: name, description: desc };
            })}
            onChange={(selection) => {
              setData('storageClassName', selection);
            }}
            isDisabled={isEdit || !storageClassesLoaded}
            placeholder={isEdit && !storageClassesLoaded ? data.storageClassName : 'Select one'}
            popperProps={{ appendTo: menuAppendTo }}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <PVSizeField
          menuAppendTo={menuAppendTo}
          fieldID="create-new-storage-size"
          currentSize={currentSize}
          size={data.size}
          setSize={(size) => setData('size', size)}
        />
      </StackItem>
    </Stack>
  );
};

export default CreateNewStorageSection;
