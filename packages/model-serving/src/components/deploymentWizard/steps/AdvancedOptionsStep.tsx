import React from 'react';
import { Form, Title, Stack, StackItem, Alert, FormGroup } from '@patternfly/react-core';
import { AccessReviewResourceAttributes, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useAccessReview } from '../../../../../../frontend/src/api';
import { ExternalRouteField } from '../fields/ExternalRouteField';
import { TokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { RuntimeArgsField } from '../fields/RuntimeArgsField';
import { EnvironmentVariablesField } from '../fields/EnvironmentVariablesField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

type AdvancedSettingsStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  project: ProjectKind;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  wizardState,
  project,
}) => {
  const externalRouteData = wizardState.state.externalRoute.data;
  const tokenAuthData = wizardState.state.tokenAuthentication.data;

  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: project.metadata.name,
  });

  const handleExternalRouteChange = (checked: boolean) => {
    wizardState.state.externalRoute.setData(checked);

    // When external route is enabled, automatically enable token authentication for security
    if (checked && (!tokenAuthData || tokenAuthData.length === 0)) {
      const defaultToken = {
        uuid: `ml-${Date.now()}`,
        name: 'default-token',
        error: '',
      };
      wizardState.state.tokenAuthentication.setData([defaultToken]);
    }
  };

  return (
    <>
      <Form>
        <Stack>
          <StackItem>
            <Title headingLevel="h2">Advanced Settings (optional)</Title>
          </StackItem>
        </Stack>

        <Stack hasGutter>
          <StackItem>
            <FormGroup
              label="External route"
              data-testid="external-route-section"
              fieldId="model-access"
            >
              <ExternalRouteField
                isChecked={externalRouteData}
                allowCreate={allowCreate}
                onChange={handleExternalRouteChange}
              />
            </FormGroup>
          </StackItem>

          <StackItem>
            <FormGroup
              label="Token authentication"
              data-testid="auth-section"
              fieldId="alt-form-checkbox-auth"
            >
              <TokenAuthenticationField
                tokens={tokenAuthData}
                allowCreate={allowCreate}
                onChange={wizardState.state.tokenAuthentication.setData}
              />
            </FormGroup>
          </StackItem>

          {externalRouteData && (!tokenAuthData || tokenAuthData.length === 0) && (
            <StackItem>
              <Alert
                id="external-route-no-token-alert"
                data-testid="external-route-no-token-alert"
                variant="warning"
                isInline
                title="Making models available by external routes without requiring authorization can lead to security vulnerabilities."
              />
            </StackItem>
          )}

          <StackItem>
            <FormGroup
              label="Configuration parameters"
              data-testid="configuration-params"
              fieldId="configuration-params"
            >
              <Stack hasGutter>
                <StackItem>
                  <RuntimeArgsField
                    data={wizardState.state.runtimeArgs.data}
                    onChange={wizardState.state.runtimeArgs.setData}
                    allowCreate={allowCreate}
                    predefinedArgs={[]} // TODO: Get predefined arguments from selected serving runtime
                  />
                </StackItem>
                <StackItem>
                  <EnvironmentVariablesField
                    data={wizardState.state.environmentVariables.data}
                    onChange={wizardState.state.environmentVariables.setData}
                    allowCreate={allowCreate}
                    predefinedVars={[]} // TODO: Get predefined variables from selected serving runtime
                  />
                </StackItem>
              </Stack>
            </FormGroup>
          </StackItem>
        </Stack>
      </Form>
    </>
  );
};
