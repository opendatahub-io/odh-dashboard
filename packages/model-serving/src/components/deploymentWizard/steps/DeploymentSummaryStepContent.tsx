import React from 'react';
import { z } from 'zod';
import { type UseModelDeploymentWizardState } from '../useDeploymentWizard';

export type DeploymentSummaryStepData = z.infer<typeof deploymentSummaryStepSchema>;

export const deploymentSummaryStepSchema = z.object({});

type DeploymentSummaryStepContentComponentProps = {
  wizardState: UseModelDeploymentWizardState;
};

export const DeploymentSummaryStepContent: React.FC<DeploymentSummaryStepContentComponentProps> = ({
  wizardState,
}) => {
  return (
    <>
      <div>
        ***Summary page content*** <br />
        Name: {wizardState.state.k8sNameDesc.data.name}
      </div>
    </>
  );
};
