import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Wizard, WizardStep } from '@patternfly/react-core';
import ScrollLock from '~/app/components/ScrollLock';
import { deployAgentWizardSteps } from './constants';
import DeployAgentWizardFooter from './DeployAgentWizardFooter';
import ExitDeployAgentModal from './ExitDeployAgentModal';
import { deployAgentWizardStepSubtitles } from './wizardOptions';
import { DeployAgentWizardStepTitle } from './types';
import { AgentDeployWizardProvider, useAgentDeployWizardContext } from './useAgentDeployWizard';
import { useAgentDeployWizardValidation } from './useAgentDeployWizardValidation';
import { useExitDeployAgentWizard } from './useExitDeployAgentWizard';

type AgentDeployWizardContentProps = {
  returnRoute?: string;
};

const AgentDeployWizardContent: React.FC<AgentDeployWizardContentProps> = ({ returnRoute }) => {
  const { formData, isDirty } = useAgentDeployWizardContext();
  const validation = useAgentDeployWizardValidation(formData);
  const [activeStepIndex, setActiveStepIndex] = React.useState(1);

  const { isExitModalOpen, closeExitModal, handleExitConfirm, exitWizard, exitWizardOnSubmit } =
    useExitDeployAgentWizard({
      namespace: formData.project,
      returnRoute,
      isDirty,
      isDeployFormValid: validation.isDeployFormValid,
    });

  const description =
    deployAgentWizardStepSubtitles[
      deployAgentWizardSteps[activeStepIndex - 1]?.name ??
        DeployAgentWizardStepTitle.IMAGE_SELECTION
    ];

  const wizardFooter = React.useMemo(
    () => <DeployAgentWizardFooter getIsNextDisabled={validation.isNextStepDisabled} />,
    [validation.isNextStepDisabled],
  );

  return (
    <ScrollLock>
      <>
        {isExitModalOpen && (
          <ExitDeployAgentModal onClose={closeExitModal} onConfirm={handleExitConfirm} />
        )}
        <ApplicationsPage title="Deploy agent" description={description} loaded empty={false}>
          <Wizard
            aria-label="Deploy agent"
            onClose={exitWizard}
            onSave={exitWizardOnSubmit}
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
    <AgentDeployWizardContent returnRoute={returnRoute} />
  </AgentDeployWizardProvider>
);

export default AgentDeployWizard;
