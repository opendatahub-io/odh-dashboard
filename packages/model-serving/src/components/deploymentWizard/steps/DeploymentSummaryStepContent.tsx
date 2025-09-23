import React from 'react';
import { z } from 'zod';
import {
  AvailableAiAssetsFieldsComponent,
  AvailableAiAssetsFieldsData,
  isValidAvailableAiAssetsFieldsData,
} from '../fields/AvailableAiAssetsFields';
import { type UseModelDeploymentWizardState } from '../useDeploymentWizard';

export type DeploymentSummaryStepData = z.infer<typeof deploymentSummaryStepSchema>;

export const deploymentSummaryStepSchema = z.object({
  AAAData: z.custom<AvailableAiAssetsFieldsData>(() => {
    return isValidAvailableAiAssetsFieldsData();
  }),
});

type DeploymentSummaryStepContentComponentProps = {
  wizardState: UseModelDeploymentWizardState;
};

export const DeploymentSummaryStepContent: React.FC<DeploymentSummaryStepContentComponentProps> = ({
  wizardState,
}) => {
  return (
    <>
      <div>***Other fields***</div>
      <AvailableAiAssetsFieldsComponent
        data={wizardState.state.AAAData.data}
        setData={wizardState.state.AAAData.setData}
        wizardData={wizardState}
      />
    </>
  );
};
