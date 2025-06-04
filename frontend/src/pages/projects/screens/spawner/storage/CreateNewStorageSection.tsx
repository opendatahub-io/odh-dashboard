import * as React from 'react';
import { Alert, FormSection, HelperTextItem } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { StorageData, UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import PVSizeField from '#~/pages/projects/components/PVSizeField';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  isK8sNameDescriptionDataValid,
  LimitNameResourceType,
} from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import StorageClassSelect from './StorageClassSelect';
import AccessModeField from './AccessModeField';

type CreateNewStorageSectionProps<D extends StorageData> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  currentStatus?: PersistentVolumeClaimKind['status'];
  autoFocusName?: boolean;
  menuAppendTo?: HTMLElement | 'inline';
  disableStorageClassSelect?: boolean;
  onNameChange?: (value: string) => void;
  setValid?: (isValid: boolean) => void;
  hasDuplicateName?: boolean;
  editableK8sName?: boolean;
};

const CreateNewStorageSection = <D extends StorageData>({
  data,
  setData,
  currentStatus,
  menuAppendTo,
  autoFocusName,
  disableStorageClassSelect,
  onNameChange,
  setValid,
  hasDuplicateName,
  editableK8sName,
}: CreateNewStorageSectionProps<D>): React.ReactNode => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const { data: clusterStorageNameDesc, onDataChange: setClusterNameDesc } =
    useK8sNameDescriptionFieldData({
      initialData: {
        name: data.name,
        k8sName: data.k8sName,
        description: data.description,
      },
      limitNameResourceType: LimitNameResourceType.PVC,
      editableK8sName,
    });

  React.useEffect(() => {
    setData('name', clusterStorageNameDesc.name);
    setData('k8sName', clusterStorageNameDesc.k8sName.value);
    setData('description', clusterStorageNameDesc.description);
    onNameChange?.(clusterStorageNameDesc.name);
    setValid?.(isK8sNameDescriptionDataValid(clusterStorageNameDesc));
    // only update if the name description changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterStorageNameDesc]);

  return (
    <FormSection>
      <K8sNameDescriptionField
        data={clusterStorageNameDesc}
        onDataChange={setClusterNameDesc}
        dataTestId="create-new-storage"
        autoFocusName={autoFocusName}
        nameHelperText={
          hasDuplicateName ? (
            <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
              <b>{data.name}</b> already exists. Try a different name.
            </HelperTextItem>
          ) : undefined
        }
      />
      {isStorageClassesAvailable && (
        <>
          <StorageClassSelect
            storageClassName={data.storageClassName}
            setStorageClassName={(name) => setData('storageClassName', name)}
            additionalHelperText={
              <Alert
                variant="info"
                title="The storage class cannot be changed after creation."
                isInline
                isPlain
              />
            }
            disableStorageClassSelect={disableStorageClassSelect}
            menuAppendTo={menuAppendTo}
          />
          <AccessModeField
            storageClassName={data.storageClassName}
            currentAccessMode={data.accessMode}
            canEditAccessMode={editableK8sName}
            setAccessMode={(accessMode) => setData('accessMode', accessMode)}
          />
        </>
      )}
      <PVSizeField
        fieldID="create-new-storage-size"
        currentStatus={currentStatus}
        size={String(data.size)}
        setSize={(size) => setData('size', size)}
        existingPvcName={data.existingPvc?.metadata.name}
      />
    </FormSection>
  );
};

export default CreateNewStorageSection;
