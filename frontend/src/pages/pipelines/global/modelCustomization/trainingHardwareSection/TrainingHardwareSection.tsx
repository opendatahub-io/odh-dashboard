import { FormGroup, FormSection } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { PodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/usePodSpecOptionsState';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import StorageClassSelect from '~/pages/projects/screens/spawner/storage/StorageClassSelect';
import TrainingHardwareProfileFormSection from './TrainingHardwareProfileFormSection';
import { ContainerCustomSize } from './ContainerCustomSize';

type TrainingHardwareSectionProps = {
  podSpecOptionsState: PodSpecOptionsState;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const TrainingHardwareSection: React.FC<TrainingHardwareSectionProps> = ({
  podSpecOptionsState,
  data,
  setData,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const trainingHardwareDescription = `Select ${
    isHardwareProfilesAvailable ? 'hardware' : 'accelerator'
  } profiles to match the hardware requirements of your workloads to available node resources. The hardware resources will be used for SDG, training and evaluation run phases.`;

  return (
    <FormSection
      id={FineTunePageSections.TRAINING_HARDWARE}
      title={fineTunePageSectionTitles[FineTunePageSections.TRAINING_HARDWARE]}
    >
      {trainingHardwareDescription}
      {isHardwareProfilesAvailable ? (
        <TrainingHardwareProfileFormSection
          data={podSpecOptionsState.hardwareProfile.formData}
          setData={podSpecOptionsState.hardwareProfile.setFormData}
        />
      ) : (
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
      )}
      <FormGroup label="Training nodes" isRequired>
        <NumberInputWrapper
          min={0}
          value={Number(data.trainingNode)}
          onChange={(value) => {
            setData('trainingNode', Number(value));
          }}
        />
      </FormGroup>

      {isStorageClassesAvailable && (
        <StorageClassSelect
          isRequired
          storageClassName={data.storageClass}
          setStorageClassName={(name) => setData('storageClass', name)}
        />
      )}
    </FormSection>
  );
};

export default TrainingHardwareSection;
