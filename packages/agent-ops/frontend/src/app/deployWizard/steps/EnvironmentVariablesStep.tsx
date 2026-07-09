import * as React from 'react';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import { Form, FormGroup } from '@patternfly/react-core';
import EnvironmentVariablesField from '~/app/deployWizard/fields/EnvironmentVariablesField';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';
import { deployAgentWizardStepSubtitles } from '~/app/deployWizard/wizardOptions';
import { DeployAgentWizardStepTitle } from '~/app/deployWizard/types';

const EnvironmentVariablesStep: React.FC = () => {
  const { formData, addEnvVar, removeEnvVar, updateEnvVar } = useAgentDeployWizardContext();

  return (
    <Form>
      <FormSection
        title="Environment Variables"
        description={
          deployAgentWizardStepSubtitles[DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES]
        }
      >
        <FormGroup label="Environment variables" fieldId="deploy-agent-environment-variables">
          <EnvironmentVariablesField
            envVars={formData.envVars}
            onAdd={addEnvVar}
            onRemove={removeEnvVar}
            onUpdate={updateEnvVar}
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default EnvironmentVariablesStep;
