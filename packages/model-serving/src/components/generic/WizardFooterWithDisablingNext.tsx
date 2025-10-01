import React from 'react';
import { useWizardContext, WizardFooter } from '@patternfly/react-core';

// When clicking Next, the default WizardFooter will skip over disabled steps, but we want to prevent that and just disable the Next button
export const WizardFooterWithDisablingNext: React.FC = () => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  return (
    <WizardFooter
      activeStep={activeStep}
      onNext={goToNextStep}
      isNextDisabled={steps[activeStep.index]?.isDisabled} // activeStep.index starts at 1, so we just pass the current step's index for the next step
      onBack={goToPrevStep}
      onClose={close}
      isBackDisabled={activeStep.index === 1}
    />
  );
};
