import React from 'react';
import { Form } from '@patternfly/react-core';
import { AdvancedOptionsSection } from '../fields/AdvancedOptionsSection';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  tokenAuthAlert?: boolean;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  tokenAuthAlert = false,
}) => {
  return (
    <>
      <Form>
        <AdvancedOptionsSection
          data={wizardState.state.advancedSettings.data}
          setData={wizardState.state.advancedSettings.updateField}
          allowCreate
          tokenAuthAlert={tokenAuthAlert}
        />
      </Form>
    </>
  );
};
