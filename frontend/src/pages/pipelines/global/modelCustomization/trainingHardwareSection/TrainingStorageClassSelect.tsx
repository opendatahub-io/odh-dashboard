import React from 'react';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { storageClassSchema } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';
import StorageClassSelect from '#~/pages/projects/screens/spawner/storage/StorageClassSelect';
import usePreferredStorageClass from '#~/pages/projects/screens/spawner/storage/usePreferredStorageClass';

type TrainingStorageClassSelectProps = {
  data: string;
  setData: (data: string) => void;
};

const TrainingStorageClassSelect: React.FC<TrainingStorageClassSelectProps> = ({
  data,
  setData,
}) => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const { getFieldValidation, getFieldValidationProps, markFieldTouched } = useZodFormValidation(
    data,
    storageClassSchema,
  );
  const preferredStorageClass = usePreferredStorageClass();

  // when storageClass is unavailable
  React.useEffect(() => {
    if (!isStorageClassesAvailable && preferredStorageClass) {
      setData(preferredStorageClass.metadata.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStorageClassesAvailable, preferredStorageClass]);

  if (!isStorageClassesAvailable) {
    return null;
  }

  return (
    <>
      <StorageClassSelect
        isRequired
        storageClassName={data}
        setStorageClassName={(name) => {
          setData(name);
          markFieldTouched();
        }}
        validated={getFieldValidationProps().validated}
      />
      <ZodErrorHelperText zodIssue={getFieldValidation()} />
    </>
  );
};

export default TrainingStorageClassSelect;
