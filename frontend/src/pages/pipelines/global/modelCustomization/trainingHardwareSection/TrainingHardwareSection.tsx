import { FormGroup, Stack, StackItem, ValidatedOptions } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { useIlabPodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import StorageClassSelect from '~/pages/projects/screens/spawner/storage/StorageClassSelect';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ValidationContext } from '~/utilities/useValidation';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';
import FormSection from '~/components/pf-overrides/FormSection';
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
  projectName: string;
};

const TrainingHardwareSection: React.FC<TrainingHardwareSectionProps> = ({
  ilabPipelineLoaded,
  ilabPipelineVersion,
  trainingNode,
  setTrainingNode,
  storageClass,
  setStorageClass,
  setHardwareFormData,
  projectName,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const trainingNodeValidationIssues = getAllValidationIssues(['trainingNode']);
  const storageClassValidationIssues = getAllValidationIssues(['storageClass']);

  const podSpecOptionsState = useIlabPodSpecOptionsState(ilabPipelineVersion, setHardwareFormData);

  return (
    <FormSection
      id={FineTunePageSections.TRAINING_HARDWARE}
      title={fineTunePageSectionTitles[FineTunePageSections.TRAINING_HARDWARE]}
      description={
        <>
          Select {isHardwareProfilesAvailable ? 'a hardware' : 'an accelerator'} profile to match
          the hardware requirements of your workload to available node resources. The hardware
          resources will be used for the SDG, training, and evaluation run phases.
        </>
      }
    >
      {isHardwareProfilesAvailable ? (
        <TrainingHardwareProfileFormSection
          data={podSpecOptionsState.hardwareProfile.formData}
          setData={podSpecOptionsState.hardwareProfile.setFormData}
          projectName={projectName}
        />
      ) : (
        <TrainingAcceleratorFormSection podSpecOptionsState={podSpecOptionsState} />
      )}
      <FormGroup label="Training nodes" isRequired>
        <Stack hasGutter>
          <StackItem>
            Specify the total number of nodes that will be used in the run. 1 node will be used for
            the evaluation run phase.
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
                validated={
                  trainingNodeValidationIssues.length > 0 ? ValidatedOptions.error : undefined
                }
              />
              <ZodErrorHelperText zodIssue={trainingNodeValidationIssues} />
            </StackItem>
          )}
        </Stack>
      </FormGroup>

      {isStorageClassesAvailable && (
        <StorageClassSelect
          isRequired
          storageClassName={storageClass}
          setStorageClassName={(name) => setStorageClass(name)}
          validated={storageClassValidationIssues.length > 0 ? ValidatedOptions.error : undefined}
        />
      )}
      {storageClassValidationIssues.length > 0 && (
        <ZodErrorHelperText zodIssue={storageClassValidationIssues} />
      )}
    </FormSection>
  );
};

export default TrainingHardwareSection;
