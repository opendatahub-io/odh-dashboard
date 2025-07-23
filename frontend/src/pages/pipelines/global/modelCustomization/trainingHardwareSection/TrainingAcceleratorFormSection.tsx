import React from 'react';
import AcceleratorProfileSelectField from '#~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { IlabPodSpecOptionsState } from '#~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { ContainerCustomSize } from './ContainerCustomSize';

type TrainingAcceleratorSectionProps = {
  projectName: string;
  podSpecOptionsState: IlabPodSpecOptionsState;
};

export const TrainingAcceleratorFormSection: React.FC<TrainingAcceleratorSectionProps> = ({
  podSpecOptionsState,
  projectName,
}) => (
  <>
    <AcceleratorProfileSelectField
      isRequired
      currentProject={projectName}
      initialState={podSpecOptionsState.acceleratorProfile.initialState}
      acceleratorProfilesLoaded={podSpecOptionsState.acceleratorProfile.loaded}
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
