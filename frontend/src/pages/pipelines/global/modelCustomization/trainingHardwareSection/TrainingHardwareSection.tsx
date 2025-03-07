import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { useIlabPodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import StorageClassSelect from '~/pages/projects/screens/spawner/storage/StorageClassSelect';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import TrainingHardwareProfileFormSection from './TrainingHardwareProfileFormSection';
import { TrainingAcceleratorFormSection } from './TrainingAcceleratorFormSection';

type TrainingHardwareSectionProps = {
  ilabPipelineLoaded: boolean;
  ilabPipelineVersion: PipelineVersionKF | null;
  trainingNode: number;
  setTrainingNode: (data: number) => void;
  storageClass: string;
  setStorageClass: (data: string) => void;
  setHardwareFormData: (data: ModelCustomizationFormData['hardware']) => void;
};

const TrainingHardwareSection: React.FC<TrainingHardwareSectionProps> = ({
  ilabPipelineLoaded,
  ilabPipelineVersion,
  trainingNode,
  setTrainingNode,
  storageClass,
  setStorageClass,
  setHardwareFormData,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();

  // when storageClass is unavailable
  React.useEffect(() => {
    if (!isStorageClassesAvailable && preferredStorageClass) {
      setStorageClass(preferredStorageClass.metadata.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStorageClassesAvailable, preferredStorageClass]);

  const trainingHardwareDescription = `Select ${
    isHardwareProfilesAvailable ? 'hardware' : 'accelerator'
  } profiles to match the hardware requirements of your workloads to available node resources. The hardware resources will be used for SDG, training and evaluation run phases.`;

  const podSpecOptionsState = useIlabPodSpecOptionsState(ilabPipelineVersion, setHardwareFormData);

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
        <TrainingAcceleratorFormSection podSpecOptionsState={podSpecOptionsState} />
      )}
      <FormGroup label="Training nodes" isRequired>
        <Stack hasGutter>
          <StackItem>
            These are total number of nodes. 1 node will be used for the evaluation run phase.
          </StackItem>

          {ilabPipelineLoaded && (
            <StackItem>
              <NumberInputWrapper
                data-testid="training-node"
                min={1}
                value={trainingNode}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    setTrainingNode(value);
                  }
                }}
              />
            </StackItem>
          )}
        </Stack>
      </FormGroup>

      {isStorageClassesAvailable && (
        <StorageClassSelect
          isRequired
          storageClassName={storageClass}
          setStorageClassName={(name) => setStorageClass(name)}
        />
      )}
    </FormSection>
  );
};

export default TrainingHardwareSection;
