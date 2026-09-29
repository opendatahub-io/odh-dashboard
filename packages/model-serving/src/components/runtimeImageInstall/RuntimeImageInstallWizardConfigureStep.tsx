import React from 'react';
import { Spinner, useWizardContext } from '@patternfly/react-core';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetProps,
} from '../../../extension-points/runtime-image-install-target';

type RuntimeImageInstallWizardConfigureStepProps = {
  selectedTarget: RuntimeImageInstallTargetExtension | undefined;
  targetData: RuntimeImageInstallTargetProps['targetData'] | undefined;
  cancelReturnRoute: string;
};

const RuntimeImageInstallWizardConfigureStep: React.FC<
  RuntimeImageInstallWizardConfigureStepProps
> = ({ selectedTarget, targetData, cancelReturnRoute }) => {
  const { goToPrevStep } = useWizardContext();

  if (!selectedTarget || !targetData) {
    return null;
  }

  return (
    <LazyCodeRefComponent
      component={selectedTarget.properties.component}
      fallback={<Spinner aria-label="Loading install configuration" />}
      props={{ targetData, onBack: goToPrevStep, cancelReturnRoute }}
    />
  );
};

export default RuntimeImageInstallWizardConfigureStep;
