import React from 'react';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { IlabPodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import { createAcceleratorResourcesSchema } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ContainerCustomSize } from './ContainerCustomSize';

type TrainingAcceleratorSectionProps = {
  podSpecOptionsState: IlabPodSpecOptionsState;
};

export const TrainingAcceleratorFormSection: React.FC<TrainingAcceleratorSectionProps> = ({
  podSpecOptionsState,
}) => {
  const validation = useValidation(
    podSpecOptionsState.podSpecOptions,
    createAcceleratorResourcesSchema,
  );

  return (
    <ValidationContext.Provider value={validation}>
      <>
        <AcceleratorProfileSelectField
          isRequired
          initialState={podSpecOptionsState.acceleratorProfile.initialState}
          formData={podSpecOptionsState.acceleratorProfile.formData}
          setFormData={podSpecOptionsState.acceleratorProfile.setFormData}
        />
        {!!podSpecOptionsState.podSpecOptions.selectedAcceleratorProfile && (
          <ContainerCustomSize
            resources={podSpecOptionsState.ContainerSize.selectedSize}
            setSize={podSpecOptionsState.ContainerSize.setSelectedSize}
          />
        )}
      </>
    </ValidationContext.Provider>
  );
};
