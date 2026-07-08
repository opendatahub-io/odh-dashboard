import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Alert, Wizard, WizardStep } from '@patternfly/react-core';
import ScrollLock from '~/app/components/ScrollLock';
import { deployAgentWizardSteps } from './deployAgentWizardSteps';
import DeployAgentWizardFooter from './DeployAgentWizardFooter';
import ExitDeployAgentModal from './ExitDeployAgentModal';
import { deployAgentWizardStepSubtitles } from './wizardOptions';
import { DeployAgentWizardStepTitle } from './types';
import { AgentDeployWizardProvider, useAgentDeployWizardContext } from './useAgentDeployWizard';
import { useAgentDeployWizardValidation } from './useAgentDeployWizardValidation';
import { useDeployAgentSubmit } from './useDeployAgentSubmit';
import { useExitDeployAgentWizard } from './useExitDeployAgentWizard';

type AgentDeployWizardContentProps = {
  entryNamespace: string;
  returnRoute?: string;
};

const AgentDeployWizardContent: React.FC<AgentDeployWizardContentProps> = ({
  entryNamespace,
  returnRoute,
}) => {
  const { formData, isDirty } = useAgentDeployWizardContext();
  const validation = useAgentDeployWizardValidation(formData);
  const [activeStepIndex, setActiveStepIndex] = React.useState(1);

  const { submitDeploy, isDeploying, deployError } = useDeployAgentSubmit({
    formData,
    isDeployFormValid: validation.isDeployFormValid,
  });

  const { isExitModalOpen, closeExitModal, handleExitConfirm, exitWizard } =
    useExitDeployAgentWizard({
      namespace: formData.project,
      entryNamespace,
      returnRoute,
      isDirty,
    });

  const description =
    deployAgentWizardStepSubtitles[
      deployAgentWizardSteps[activeStepIndex - 1]?.name ??
        DeployAgentWizardStepTitle.IMAGE_SELECTION
    ];

  const getIsNextDisabled = React.useCallback(
    (stepIndex: number) => validation.isNextStepDisabled(stepIndex) || isDeploying,
    [isDeploying, validation],
  );

  const wizardFooter = React.useMemo(
    () => (
      <DeployAgentWizardFooter getIsNextDisabled={getIsNextDisabled} isSubmitting={isDeploying} />
    ),
    [getIsNextDisabled, isDeploying],
  );

  return (
    <ScrollLock>
      <>
        {isExitModalOpen && (
          <ExitDeployAgentModal onClose={closeExitModal} onConfirm={handleExitConfirm} />
        )}
        <ApplicationsPage title="Deploy agent" description={description} loaded empty={false}>
          {deployError ? (
            <Alert
              variant="danger"
              title="Deploy failed"
              isInline
              data-testid="deploy-agent-submit-error"
            >
              {deployError}
            </Alert>
          ) : null}
          <Wizard
            aria-label="Deploy agent"
            onClose={() => {
              if (!isDeploying) {
                exitWizard();
              }
            }}
            onSave={submitDeploy}
            footer={wizardFooter}
            onStepChange={(_event, currentStep) => {
              setActiveStepIndex(currentStep.index);
            }}
          >
            {deployAgentWizardSteps.map(({ name, id, Component }, index) => (
              <WizardStep
                key={id}
                name={name}
                id={id}
                isDisabled={!validation.isStepAccessible(index + 1)}
              >
                <Component />
              </WizardStep>
            ))}
          </Wizard>
        </ApplicationsPage>
      </>
    </ScrollLock>
  );
};

type AgentDeployWizardProps = {
  namespace: string;
  returnRoute?: string;
};

const AgentDeployWizard: React.FC<AgentDeployWizardProps> = ({ namespace, returnRoute }) => (
  <AgentDeployWizardProvider key={namespace} namespace={namespace}>
    <AgentDeployWizardContent entryNamespace={namespace} returnRoute={returnRoute} />
  </AgentDeployWizardProvider>
);

export default AgentDeployWizard;
