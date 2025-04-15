import React from 'react';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { IlabPodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { ContainerCustomSize } from './ContainerCustomSize';

type TrainingAcceleratorSectionProps = {
  podSpecOptionsState: IlabPodSpecOptionsState;
};

export const TrainingAcceleratorFormSection: React.FC<TrainingAcceleratorSectionProps> = ({
  podSpecOptionsState,
}) => (
  <>
    <AcceleratorProfileSelectField
      isRequired
      initialState={podSpecOptionsState.acceleratorProfile.initialState}
      formData={podSpecOptionsState.acceleratorProfile.formData}
      setFormData={podSpecOptionsState.acceleratorProfile.setFormData}
    />
    {!!podSpecOptionsState.acceleratorProfile.formData.profile && (
      <ContainerCustomSize
        resources={podSpecOptionsState.containerSize.selectedSize}
        setSize={podSpecOptionsState.containerSize.setSelectedSize}
      />
    )}
  </>
);
