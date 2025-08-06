import React from 'react';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { storageClassSchema } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';
import StorageClassSelect from '#~/pages/projects/screens/spawner/storage/StorageClassSelect';
import { useDefaultStorageClass } from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { useGetStorageClassConfig } from '#~/pages/projects/screens/spawner/storage/useGetStorageClassConfig';

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
  const [defaultStorageClass] = useDefaultStorageClass();
  const { storageClasses, storageClassesLoaded, selectedStorageClassConfig } =
    useGetStorageClassConfig();

  // when storageClass is unavailable
  React.useEffect(() => {
    if (!isStorageClassesAvailable && defaultStorageClass) {
      setData(defaultStorageClass.metadata.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStorageClassesAvailable, defaultStorageClass]);

  if (!isStorageClassesAvailable) {
    return null;
  }

  return (
    <>
      <StorageClassSelect
        storageClasses={storageClasses}
        storageClassesLoaded={storageClassesLoaded}
        selectedStorageClassConfig={selectedStorageClassConfig}
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
