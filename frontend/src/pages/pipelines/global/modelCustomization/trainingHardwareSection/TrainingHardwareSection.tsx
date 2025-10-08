import React from 'react';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { useIlabPodSpecOptionsState } from '#~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import FormSection from '#~/components/pf-overrides/FormSection';
import { HardwareFormData } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import TrainingNodeInput from '#~/pages/pipelines/global/modelCustomization/trainingHardwareSection/TrainingNodeInput';
import TrainingStorageClassSelect from '#~/pages/pipelines/global/modelCustomization/trainingHardwareSection/TrainingStorageClassSelect';
import TrainingHardwareProfileFormSection from './TrainingHardwareProfileFormSection';

type TrainingHardwareSectionProps = {
  ilabPipelineVersion: PipelineVersionKF | null;
  trainingNode: number;
  setTrainingNode: (data: number) => void;
  storageClass: string;
  setStorageClass: (data: string) => void;
  setHardwareFormData: (data: HardwareFormData) => void;
  projectName: string;
};

const TrainingHardwareSection: React.FC<TrainingHardwareSectionProps> = ({
  ilabPipelineVersion,
  trainingNode,
  setTrainingNode,
  storageClass,
  setStorageClass,
  setHardwareFormData,
  projectName,
}) => {
  const podSpecOptionsState = useIlabPodSpecOptionsState(ilabPipelineVersion, setHardwareFormData);

  return (
    <FormSection
      id={FineTunePageSections.TRAINING_HARDWARE}
      title={fineTunePageSectionTitles[FineTunePageSections.TRAINING_HARDWARE]}
      description={
        <>
          Select a hardware profile to match the hardware requirements of your workload to available
          node resources. The hardware resources will be used for the SDG, training, and evaluation
          run phases.
        </>
      }
      data-testid={FineTunePageSections.TRAINING_HARDWARE}
    >
      <TrainingHardwareProfileFormSection
        data={podSpecOptionsState.hardwareProfile.formData}
        setData={podSpecOptionsState.hardwareProfile.setFormData}
        projectName={projectName}
      />

      <TrainingNodeInput data={trainingNode} setData={setTrainingNode} />
      <TrainingStorageClassSelect data={storageClass} setData={setStorageClass} />
    </FormSection>
  );
};

export default TrainingHardwareSection;
