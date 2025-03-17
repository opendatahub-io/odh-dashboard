import React from 'react';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { IlabPodSpecOptionsState } from '~/pages/pipelines/global/modelCustomization/useIlabPodSpecOptionsState';
import { ValidationContext } from '~/utilities/useValidation';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';
import { ContainerCustomSize } from './ContainerCustomSize';

type TrainingAcceleratorSectionProps = {
  podSpecOptionsState: IlabPodSpecOptionsState;
};

export const TrainingAcceleratorFormSection: React.FC<TrainingAcceleratorSectionProps> = ({
  podSpecOptionsState,
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const acceleratorProfileValidationIssues = getAllValidationIssues([
    'hardware',
    'acceleratorProfileConfig',
  ]);
  const cpuValidationIssues = getAllValidationIssues(['hardware', 'cpuCount']);
  const memoryValidationIssues = getAllValidationIssues(['hardware', 'memoryCount']);

  return (
    <>
      <AcceleratorProfileSelectField
        isRequired
        initialState={podSpecOptionsState.acceleratorProfile.initialState}
        formData={podSpecOptionsState.acceleratorProfile.formData}
        setFormData={podSpecOptionsState.acceleratorProfile.setFormData}
      />
      <ZodErrorHelperText zodIssue={acceleratorProfileValidationIssues} />
      {!!podSpecOptionsState.acceleratorProfile.formData.profile && (
        <>
          <ContainerCustomSize
            resources={podSpecOptionsState.containerSize.selectedSize}
            setSize={podSpecOptionsState.containerSize.setSelectedSize}
            cpuValidationIssue={cpuValidationIssues}
            memoryValidationIssue={memoryValidationIssues}
          />
        </>
      )}
    </>
  );
};
