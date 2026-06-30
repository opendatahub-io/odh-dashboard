import * as React from 'react';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import EnvironmentVariablesField from '~/app/deployWizard/fields/EnvironmentVariablesField';
import { useAgentDeployWizardContext } from '~/app/deployWizard/useAgentDeployWizard';

const EnvironmentVariablesStep: React.FC = () => {
  const { formData, addEnvVar, removeEnvVar, updateEnvVar } = useAgentDeployWizardContext();

  return (
    <Form>
      <FormSection title="Environment Variables">
        <FormGroup label="Environment variables" fieldId="deploy-agent-environment-variables">
          <EnvironmentVariablesField
            envVars={formData.envVars}
            onAdd={addEnvVar}
            onRemove={removeEnvVar}
            onUpdate={updateEnvVar}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Optional environment variables passed to the agent container at runtime.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default EnvironmentVariablesStep;
